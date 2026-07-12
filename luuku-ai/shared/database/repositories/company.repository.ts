import { Prisma } from "@prisma/client";
import { prisma } from "../client";

import { Company } from "../../crm/company-types";
import { CompanyMapper } from "../mappers/company.mapper";

export class CompanyRepository {

    async findAll(): Promise<Company[]> {

        const companies =
            await prisma.company.findMany({

                orderBy: {
                    createdAt: "asc"
                }

            });

        return companies.map(

            CompanyMapper.toDomain

        );

    }

    async findById(

        id: string

    ): Promise<Company | null> {

        const company =
            await prisma.company.findUnique({

                where: {
                    id
                }

            });

        if (!company) {

            return null;

        }

        return CompanyMapper.toDomain(

            company

        );

    }

    async findByName(

        name: string

    ): Promise<Company | null> {

        const company =
            await prisma.company.findFirst({

                where: {

                    name: {

                        contains: name,

                        mode: "insensitive"

                    }

                }

            });

        if (!company) {

            return null;

        }

        return CompanyMapper.toDomain(

            company

        );

    }

    async create(

        company: Company

    ): Promise<Company> {

        const created =
            await prisma.company.create({

                data:
                    CompanyMapper.toPersistence(

                        company

                    )

            });

        return CompanyMapper.toDomain(

            created

        );

    }

    async update(

        company: Company

    ): Promise<Company> {

        const updated =
            await prisma.company.update({

                where: {

                    id: company.id

                },

                data:
                    CompanyMapper.toPersistence(

                        company

                    )

            });

        return CompanyMapper.toDomain(

            updated

        );

    }

    async delete(

        id: string

    ): Promise<void> {

        await prisma.company.delete({

            where: {

                id

            }

        });

    }

}

export const companyRepository =
    new CompanyRepository();