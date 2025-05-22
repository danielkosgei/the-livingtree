export interface FamilyMember {
    id: string;
    name: string;
    birthYear: number;
    isLiving: boolean;
    children?: string[];
    spouse?: {
        name: string;
        birthYear: number;
        isLiving: boolean;
    };
}

export type FamilyData = FamilyMember[]; 