export function setCommunityPostLike<
  T extends { id: string; likes: number; likedByCurrentUser?: boolean },
>(posts: T[], postId: string, active: boolean): T[] {
  return posts.map((post) => {
    if (post.id !== postId || Boolean(post.likedByCurrentUser) === active) return post;
    return {
      ...post,
      likedByCurrentUser: active,
      likes: Math.max(0, post.likes + (active ? 1 : -1)),
    };
  });
}
