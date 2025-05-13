import { db } from "$lib/db";

export const load = async () => {
    const profiles = await db.query.profileTable.findMany();

    return {
        profiles,
    };
}