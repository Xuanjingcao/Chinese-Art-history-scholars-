export interface Professor {
  id: string;
  name: string;
  nameEn: string;
  title: 'professor' | 'associate' | 'assistant' | 'lecturer';
  university: string;
  specialties: string[];
  bio: string;
  achievements: string[];
  publications: string[];
  link?: string;
}

export interface UniversityGroup {
  name: string;
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
