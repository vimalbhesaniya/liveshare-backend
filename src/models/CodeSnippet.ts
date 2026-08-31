import mongoose from "mongoose";

const codeSnippetSchema = new mongoose.Schema(
  {
    uniqueCode: { type: String, required: true, unique: true, index: true },
    code: { type: String, default: "" },
    language: { type: String, default: "text" },
    passwordHash: { type: String, default: null },
  },
  { timestamps: true },
);

export const CodeSnippet =
  mongoose.models.CodeSnippet ||
  mongoose.model("CodeSnippet", codeSnippetSchema);

export type CodeSnippetDoc = {
  _id: mongoose.Types.ObjectId;
  uniqueCode: string;
  code: string;
  language: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};
