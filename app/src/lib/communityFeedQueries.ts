export async function runCommunityFeedQueries<TPost, TReaction>(
  loadPosts: () => Promise<TPost[]>,
  loadReactions?: () => Promise<TReaction[]>,
) {
  if (!loadReactions) {
    return { posts: await loadPosts(), reactions: [] as TReaction[] };
  }

  const [posts, reactions] = await Promise.all([loadPosts(), loadReactions()]);
  return { posts, reactions };
}
