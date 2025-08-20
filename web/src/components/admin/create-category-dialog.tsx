"use client";

import { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CreateCategoryDialogProps {
  children: ReactNode;
}

export function CreateCategoryDialog({ children }: CreateCategoryDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize resources.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500">
            Category creation form coming soon. For now, categories can be added through the database or API.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}