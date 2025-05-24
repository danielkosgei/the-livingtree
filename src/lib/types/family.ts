export interface FamilyMember {
    id: string;
    name: string;
    birthYear: number;
    isLiving: boolean;
    children?: string[];
    spouses?: Array<{
        id: string;
        name: string;
        birthYear: number;
        isLiving: boolean;
        marriageYear?: number;
        divorceYear?: number;
        isCurrent: boolean;
    }>;
}

export type FamilyData = FamilyMember[]; 