"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Mic, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { MessageBanner } from "@/components/message-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

const features = [
  { icon: Mic, label: "Transcricao automatica" },
  { icon: Sparkles, label: "Atas com IA" },
  { icon: Zap, label: "Tarefas e decisoes" },
];

export function AuthCard({
  title,
  description,
  action,
  alternate,
  error,
  children,
}: {
  title: string;
  description: string;
  action: string;
  alternate: { href: string; label: string; prompt: string };
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:px-8">
      <FadeIn className="hidden flex-col justify-center lg:flex">
        <Logo />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-10 space-y-4"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Aosafe Cloud Solutions</p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Transforme reunioes em acao com transcricao e IA.
          </h1>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            Meet, Zoom ou Teams — o AoMeet AI captura, transcreve e gera atas, tarefas e follow-ups automaticamente.
          </p>
        </motion.div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, label }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
              className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm"
            >
              <Icon className="mb-2 size-5 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">{action}</p>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <MessageBanner message={error} tone="error" />
            {children}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {alternate.prompt}{" "}
              <Link href={alternate.href} className="font-medium text-primary hover:underline">
                {alternate.label}
              </Link>
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
