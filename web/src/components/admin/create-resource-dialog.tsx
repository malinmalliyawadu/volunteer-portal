"use client";

import { ReactNode } from "react";
import { ResourceCategory } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CreateResourceDialogProps {
  children: ReactNode;
  categories: ResourceCategory[];
}

export function CreateResourceDialog({ children }: CreateResourceDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Resource</DialogTitle>
          <DialogDescription>
            Add a new resource for volunteers to access.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500">
            Resource creation form coming soon. For now, resources can be added through the database or API.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}