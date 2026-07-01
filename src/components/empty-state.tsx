import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
