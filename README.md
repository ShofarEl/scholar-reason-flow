
## Project info
ai.thinqscribe.com

## Payment System

The payment system uses Paystack for payment processing with both webhook and redirect-based verification for reliability.

### Webhook Setup

1. Deploy the `supabase/functions/paystack-webhook` function to your Supabase project
2. Set the `PAYSTACK_WEBHOOK_URL` environment variable to your deployed webhook URL
3. Configure the webhook URL in your Paystack dashboard to receive payment notifications

### Payment Flow

1. User initiates payment through the subscription page
2. Paystack processes the payment
3. Paystack sends webhook notification to create/update subscription
4. User is redirected back to `/payment-success` for verification
5. Frontend verifies payment and displays success/failure status

### Troubleshooting

If payments aren't reflecting:

1. Check that the webhook function is deployed and accessible
2. Verify webhook URL is correctly configured in Paystack dashboard
3. Check Supabase function logs for webhook processing errors
4. Use the manual refresh button on payment success page if automatic verification fails

### Environment Variables

```env
# Payment Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_key
VITE_PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/paystack-webhook
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**



**Use your preferred IDE**



Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS






