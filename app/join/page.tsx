"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/auth";
import { INITIAL_PLAYER_CASH } from "@/lib/game-config";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().length(6, "Room code must be exactly 6 characters"),
});

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user, isLoading } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  // Load name from local storage
  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      form.setValue("name", savedName);
    }
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", values.code.toUpperCase())
        .single();

      if (roomError || !room) {
        form.setError("code", { message: "Cannot find room" });
        return;
      }

      // Create player
      const { error: playerError } = await supabase.from("players").insert({
        user_id: user?.id,
        room_id: room.id,
        name: values.name,
        cash: INITIAL_PLAYER_CASH,
      });

      if (playerError) {
        if (playerError.code === "23505") {
          form.setError("name", {
            message: "You have already joined this room",
          });
        } else {
          form.setError("root", { message: "Failed to join room" });
        }
        return;
      }

      // Save name for future use
      localStorage.setItem("playerName", values.name);

      // Navigate to game
      router.push(`/game/${room.id}`);
    } catch (error) {
      form.setError("root", { message: "Something went wrong" });
    }
  }

  return (
    <div className="container max-w-md py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Join Room</h1>
          <p className="text-muted-foreground">
            Enter your name and room code to join the game
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Room lobby code"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                "Joining..."
              ) : isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Join Room"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
