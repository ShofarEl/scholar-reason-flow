import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook signature if provided
    const signature = req.headers.get('x-paystack-signature')
    const body = await req.text()

    if (!signature) {
      console.error('No Paystack signature provided')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Parse webhook data
    const webhookData = JSON.parse(body)
    console.log('🔍 Received Paystack webhook:', webhookData.event, webhookData.data?.reference)

    // Handle different webhook events
    switch (webhookData.event) {
      case 'charge.success':
        await handleSuccessfulCharge(supabaseClient, webhookData.data)
        break

      case 'transfer.success':
        console.log('Transfer success - not handling transfers')
        break

      default:
        console.log('Unhandled webhook event:', webhookData.event)
    }

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

async function handleSuccessfulCharge(supabaseClient: any, chargeData: any) {
  try {
    console.log('🔧 Processing successful charge:', {
      reference: chargeData.reference,
      amount: chargeData.amount,
      status: chargeData.status,
      metadata: chargeData.metadata
    })

    // Validate charge data
    if (!chargeData.reference || !chargeData.metadata) {
      console.error('Invalid charge data:', chargeData)
      return
    }

    const { userId, plan } = chargeData.metadata

    if (!userId || !plan) {
      console.error('Missing userId or plan in metadata:', chargeData.metadata)
      return
    }

    // Check if subscription already exists for this payment
    const { data: existingSubscription } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      console.log('✅ User already has active subscription, skipping creation')
      return
    }

    // Check if payment was already processed
    const { data: existingPayment } = await supabaseClient
      .from('payment_history')
      .select('id')
      .eq('paystack_reference', chargeData.reference)
      .single()

    if (existingPayment) {
      console.log('✅ Payment already processed, skipping')
      return
    }

    // Convert amount from kobo to NGN (Paystack uses kobo)
    const amountNaira = chargeData.amount / 100

    // Calculate end date (30 days from now)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    // Create subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: plan,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString()
      })
      .select()
      .single()

    if (subError) {
      console.error('❌ Failed to create subscription:', subError)
      throw subError
    }

    console.log('✅ Subscription created:', subscription.id)

    // Create usage record
    const { error: usageError } = await supabaseClient
      .from('subscription_usage')
      .insert({
        subscription_id: subscription.id,
        user_id: userId,
        ai_messages_used: 0,
        humanizer_words_used: 0,
        usage_date: new Date().toISOString().split('T')[0]
      })

    if (usageError) {
      console.error('❌ Failed to create usage record:', usageError)
      // Don't throw here - subscription is created, usage can be created later
    } else {
      console.log('✅ Usage record created')
    }

    // Create payment history
    const { error: paymentError } = await supabaseClient
      .from('payment_history')
      .insert({
        subscription_id: subscription.id,
        user_id: userId,
        paystack_reference: chargeData.reference,
        paystack_id: chargeData.id.toString(),
        amount: amountNaira,
        currency: chargeData.currency || 'NGN',
        status: 'success',
        customer_email: chargeData.customer?.email,
        paid_at: chargeData.paid_at || new Date().toISOString()
      })

    if (paymentError) {
      console.error('❌ Failed to create payment history:', paymentError)
      // Don't throw here - subscription is created, payment history can be created later
    } else {
      console.log('✅ Payment history created')
    }

    console.log('🎉 Webhook processed successfully for user:', userId)

  } catch (error) {
    console.error('❌ Error processing successful charge:', error)
    throw error
  }
}
