interface ChildInfo {
    id: string;
    otherParentId?: string;
}

export interface FamilyMember {
    id: string;
    name: string;
    birthYear: number;
    isLiving: boolean;
    children?: ChildInfo[];
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