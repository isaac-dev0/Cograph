"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { graphqlRequest } from "@/lib/graphql/client";
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CREATE_PROJECT } from "@/lib/queries/ProjectQueries";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { useUser } from "@/hooks/providers/UserProvider";
import { Loader } from "lucide-react";
import type { Project } from "@/lib/interfaces/project.interfaces";

interface ProjectCreateDialogProps {
  trigger?: React.ReactNode;
}

const schema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z
    .string()
    .max(500, {
      message: "Description must not exceed 500 characters.",
    })
    .optional(),
});

export function ProjectCreateDialog({ trigger }: ProjectCreateDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useUser();
  const { setCurrentProject, refreshProjects } = useProject();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!profile) {
      setError("You must be logged in to create project.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await graphqlRequest<{ createProject: Project }>(
        CREATE_PROJECT,
        {
          createProjectInput: {
            name: values.name,
            description: values.description || null,
            ownerId: profile.id,
          },
        },
      );

      const newProject = data.createProject;
      await refreshProjects();

      setCurrentProject(newProject);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to create project:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create project"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create Project</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Create a new project to organise your repositories.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-8">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Awesome Project"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the name of your project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="A description for my awesome project."
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the description for your project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
