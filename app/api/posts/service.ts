import { addPost, listPosts, PostEntry } from "@/lib/storage";

export class PostsService {
  public listPosts = (): Promise<PostEntry[]> => {
    return listPosts();
  };

  public addPost = (url: string): Promise<PostEntry> => {
    return addPost(url);
  };
}

export const postsService = new PostsService();
