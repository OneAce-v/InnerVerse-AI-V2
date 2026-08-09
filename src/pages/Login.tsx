import React from "react";
import { useAuth } from "../AuthContext.tsx";
import { Navigate } from "react-router";
import { Button } from "../components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
import { Heart } from "lucide-react";

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 border-border bg-card/60 backdrop-blur-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            InnerVerse AI
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Holistic Human Development & personalized AI intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button
            className="w-full h-12 text-md font-medium"
            onClick={signInWithGoogle}
          >
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you adhere to HIPAA-compliant secure handling of
            data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
