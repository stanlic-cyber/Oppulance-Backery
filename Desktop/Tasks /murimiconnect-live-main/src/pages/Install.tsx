import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, CheckCircle, Wifi, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  useEffect(() => {
    if (isInstalled) {
      // Already installed, redirect after a moment
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, navigate]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      navigate('/');
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading with cached resources',
    },
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'Browse listings even without internet',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data stays safe on your device',
    },
  ];

  if (isInstalled) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="mx-auto max-w-md space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Already Installed!</h1>
            <p className="text-muted-foreground">
              Murimi Connect is already installed on your device. Enjoy the full app experience!
            </p>
            <Button onClick={() => navigate('/')} size="lg">
              Go to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary mx-auto shadow-lg">
              <Smartphone className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Install Murimi Connect</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Get the full app experience right on your device. Fast, reliable, and works offline.
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Install Section */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              {isIOS && !isInstallable ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-center">Install on iOS</h2>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-medium">Open in Safari</p>
                        <p className="text-sm text-muted-foreground">
                          Make sure you're viewing this page in Safari browser
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-medium">Tap the Share button</p>
                        <p className="text-sm text-muted-foreground">
                          Look for the share icon at the bottom of Safari
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                        3
                      </span>
                      <div>
                        <p className="font-medium">Add to Home Screen</p>
                        <p className="text-sm text-muted-foreground">
                          Scroll down and tap "Add to Home Screen"
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              ) : isInstallable ? (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold">Ready to Install</h2>
                  <p className="text-muted-foreground">
                    Click the button below to add Murimi Connect to your device
                  </p>
                  <Button size="lg" onClick={handleInstall} className="gap-2">
                    <Download className="h-5 w-5" />
                    Install Now
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold">Installation Not Available</h2>
                  <p className="text-muted-foreground">
                    Your browser doesn't support app installation, but you can still use Murimi Connect in your browser!
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Continue to App
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Install;
