import { Stock } from "@/lib/types/supabase";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { promptTemplate } from "./prompts";

