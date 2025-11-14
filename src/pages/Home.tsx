import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, FileText, Zap, Shield, Users, CheckCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI-Powered Writing",
      description: "Transform your content with advanced AI technology that understands context and tone."
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Humanize AI Text",
      description: "Convert AI-generated content into natural, human-like writing that resonates with readers."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Get instant results with our optimized processing engine designed for speed and accuracy."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Your data is encrypted and protected with enterprise-grade security measures."
    }
  ];

  const benefits = [
    "Unlimited AI text humanization",
    "Advanced content optimization",
    "Multi-language support",
    "Priority customer support",
    "Regular feature updates",
    "Export in multiple formats"
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Content Transformation</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Transform AI Text Into
            <span className="text-primary block mt-2">Natural Human Writing</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ScribeAI helps you create authentic, engaging content that connects with your audience. 
            Powered by advanced AI technology, refined by human touch.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/humanizer')}
              className="text-lg px-8 py-6"
            >
              Try Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Create Better Content
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of content creators, marketers, and writers who trust ScribeAI
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="text-lg px-8 py-6"
              >
                Start Creating Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <span className="text-lg font-medium">Trusted by Content Creators Worldwide</span>
          </div>
          
          <div className="grid grid-cols-3 gap-8 md:gap-16">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Words Processed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">99%</div>
              <div className="text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Content?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join ScribeAI today and experience the future of content creation
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={handleGetStarted}
            className="text-lg px-8 py-6"
          >
            Get Started Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
