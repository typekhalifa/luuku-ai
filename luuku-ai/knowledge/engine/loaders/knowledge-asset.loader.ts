import fs from "node:fs/promises";
import path from "node:path";

import type {
    KnowledgeLoader,
} from "./base.loader";

import type {
    KnowledgeDocument,
    KnowledgeSource,
} from "../types";

export class KnowledgeAssetLoader
    implements KnowledgeLoader {

    readonly name = "knowledge-assets";

    private readonly root = path.resolve(
        __dirname,
        "../../",
    );

    private readonly supportedExtensions = new Set([
        ".md",
        ".txt",
        ".json",
    ]);

    async load(): Promise<KnowledgeDocument[]> {

        const documents: KnowledgeDocument[] = [];

        await this.scanDirectory(
            this.root,
            documents,
        );

        return documents;

    }

    private async scanDirectory(

        directory: string,

        documents: KnowledgeDocument[],

    ): Promise<void> {

        const entries =
            await fs.readdir(
                directory,
                {
                    withFileTypes: true,
                },
            );

        for (const entry of entries) {

            const fullPath = path.join(
                directory,
                entry.name,
            );

            if (entry.isDirectory()) {

                await this.scanDirectory(
                    fullPath,
                    documents,
                );

                continue;

            }

            const extension =
                path.extname(entry.name);

            if (
                !this.supportedExtensions.has(
                    extension,
                )
            ) {

                continue;

            }

            const content =
                await fs.readFile(
                    fullPath,
                    "utf-8",
                );

            const relativePath = path
                .relative(
                    this.root,
                    fullPath,
                )
                .replace(/\\/g, "/");

            documents.push({

                id: relativePath,

                title: entry.name,

                source: this.resolveSource(
                    relativePath,
                ),

                content,

                metadata: {

                    path: relativePath,

                    filename: entry.name,

                    directory: path.basename(
                        path.dirname(
                            relativePath,
                        ),
                    ),

                    extension,

                },

                createdAt: new Date(),

                updatedAt: new Date(),

            });

        }

    }

    private resolveSource(
        filePath: string,
    ): KnowledgeSource {

        const normalized =
            filePath.replace(
                /\\/g,
                "/",
            );

        if (
            normalized.startsWith(
                "industries/",
            )
        ) {
            return "industry";
        }

        if (
            normalized.startsWith(
                "offers/",
            )
        ) {
            return "offer";
        }

        if (
            normalized.startsWith(
                "playbooks/",
            )
        ) {
            return "playbook";
        }

        if (
            normalized.startsWith(
                "prompts/",
            )
        ) {
            return "prompt";
        }

        if (
            normalized.startsWith(
                "prospects/",
            )
        ) {
            return "prospect";
        }

        if (
            normalized.startsWith(
                "templates/",
            )
        ) {
            return "template";
        }

        return "unknown";

    }

}

export const knowledgeAssetLoader =
    new KnowledgeAssetLoader();