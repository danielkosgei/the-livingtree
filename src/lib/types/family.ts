export interface FamilyMember {
    id: string;
    name: string;
    birthYear: number;
    isLiving: boolean;
    children?: string[];
}

export type FamilyData = FamilyMember[]; 