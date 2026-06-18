export const COMMUNITY_TOPICS = ['读书笔记', '展览现场', '求学经验', '研究方法', '学者与院校'] as const;

export type CommunityTopic = typeof COMMUNITY_TOPICS[number];
export type CommunityPostStatus = 'draft' | 'published' | 'deleted';

export interface CommunityImage {
  id: string;
  source: string;
  fileId?: string;
  width: number;
  height: number;
}

export interface CommunityDraft {
  id?: string;
  title: string;
  body: string;
  topic: CommunityTopic | '';
  images: CommunityImage[];
  coverImageId: string;
  relatedProfessorId?: string;
  relatedUniversity?: string;
}

export interface CommunityPost extends CommunityDraft {
  id: string;
  userId: string;
  nickname: string;
  status: CommunityPostStatus;
  likes: number;
  comments: number;
  bookmarks: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  likedByCurrentUser?: boolean;
  bookmarkedByCurrentUser?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}
