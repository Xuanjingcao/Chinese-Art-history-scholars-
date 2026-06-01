export interface Professor {
  id: string;
  name: string;
  nameEn: string;
  title: 'professor' | 'associate' | 'assistant' | 'lecturer';
  university: string;
  country?: string;
  specialties: string[];
  standardTags?: string[];
  bio: string;
  achievements: string[];
  publications: string[];
  profileLink?: string;
  cnkiLink?: string;
  scholarLink?: string;
  createdAt?: string;
}

export interface ProfessorRecord extends Professor {
  regionId: 'huabei' | 'huadong' | 'huanan' | 'zhongxibu' | 'gangtai' | 'north-america' | 'europe' | 'japan';
  regionGlyph: string;
  regionName: string;
  regionNameEn: string;
  regionOrder: number;
  universityOrder?: number;
  professorOrder?: number;
}

export interface UniversityGroup {
  name: string;
  country?: string;
  professors: Professor[];
}

export interface Region {
  id: string;
  glyph: string;
  name: string;
  nameEn: string;
  count: number;
  universities: UniversityGroup[];
}

export type FilterRegion = 'all' | 'china' | 'overseas' | 'huabei' | 'huadong' | 'huanan' | 'zhongxibu' | 'gangtai' | 'north-america' | 'europe' | 'japan';
export type SubFilterChina = 'all' | 'huabei' | 'huadong' | 'huanan' | 'zhongxibu' | 'gangtai';
