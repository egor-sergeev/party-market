"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  type RoomSettings,
  defaultSettings,
  saveSettings,
} from "@/lib/settings";
import { Room } from "@/lib/types/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  initial_cash: z.number().min(0, "Initial cash must be positive"),
  number_of_stocks: z.number().min(1, "Must have at least 1 stock"),
  total_rounds: z.number().min(1, "Must have at least 1 round"),
  events_tone: z.string().min(1, "Events tone is required"),
  events_language: z.string().min(1, "Events language is required"),
});

interface RoomSettingsProps {
  room: Room;
}

function handleNumberChange(
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (...event: any[]) => void
) {
  const value = e.target.value;
  // Allow empty string for clearing the input
  if (value === "") {
    onChange("");
    return;
  }
  // Convert to number and remove leading zeros
  const number = parseInt(value, 10);
  if (!isNaN(number) && number >= 0) {
    onChange(number);
  }
}

export function RoomSettings({ room }: RoomSettingsProps) {
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<RoomSettings>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultSettings,
  });

  useEffect(() => {
    // Load current room settings
    form.reset({
      initial_cash: room.initial_cash,
      number_of_stocks: room.number_of_stocks,
      total_rounds: room.total_rounds,
      events_tone: room.events_tone,
      events_language: room.events_language,
    });
  }, [form, room]);

  async function onSubmit(values: RoomSettings) {
    setIsSaving(true);
    try {
      // Convert any empty string values to 0
      const sanitizedValues = {
        ...values,
        initial_cash: values.initial_cash || 0,
        number_of_stocks: values.number_of_stocks || 0,
        total_rounds: values.total_rounds || 0,
      };

      // Update room settings
      const { error } = await supabase
        .from("rooms")
        .update(sanitizedValues)
        .eq("id", room.id);

      if (error) throw error;

      // Save to local storage
      saveSettings(sanitizedValues);

      toast({
        title: "Settings saved",
        description: "Room settings have been updated successfully.",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update room settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update room settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Room Settings</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="initial_cash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Cash</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => handleNumberChange(e, field.onChange)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number_of_stocks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Stocks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => handleNumberChange(e, field.onChange)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_rounds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Rounds</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => handleNumberChange(e, field.onChange)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events_tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Events Tone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Write in a casual, friendly tone"
                    />
                  </FormControl>
                  <FormDescription>
                    How should events be written? (e.g., casual, formal, funny)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Events Language</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="English" />
                  </FormControl>
                  <FormDescription>
                    In which language should events be written?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
