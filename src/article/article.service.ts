import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateArticleDto, CreateCommentDto, UpdateArticleDto } from './dto';

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  // create/update tags
  private async createOrUpdateTag(tagName: string) {
    try {
      return await this.prisma.tag.create({
        data: { tag: tagName },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('tag')) {
        return await this.prisma.tag.findUnique({
          where: { tag: tagName },
        });
      }
      throw error;
    }
  }

  // generate slug
  private generateSlug(title: string) {
    const time = new Date().getTime();
    const string = title.replace(/\s+/g, '-').toLowerCase();
    const slug = `${string}-${time}`;
    return slug;
  }

  // * Create Article
  async createArticle(userId: number, dto: CreateArticleDto) {
    const { title, description, tagList, body } = dto;

    // set tags
    const createdTags = await Promise.all(
      tagList.map((tagName) => this.createOrUpdateTag(tagName)),
    );

    const slug = this.generateSlug(title);
    try {
      // create article
      const article = await this.prisma.article.create({
        data: {
          authorId: userId,
          title,
          description,
          body,
          slug,
          tagList: { connect: createdTags.map((tag) => ({ id: tag.id })) },
        },
        include: {
          tagList: { select: { tag: true } },
          author: {
            select: {
              userName: true,
              bio: true,
              image: true,
            },
          },
        },
      });

      if (!article) {
        return new UnprocessableEntityException(`Failed to create article}`);
      }

      // return created article
      const { id, authorId, favoritedBy, ...rest } = article;
      return { article: rest };
    } catch (error) {
      // if tag already exists
      if (error.code === 'P2002' && error.meta?.target?.includes('tag')) {
        throw new ConflictException('Tag already exists');
      }
      throw error;
    }
  }

  // * Get Articles
  async getArticles(
    tag?: string,
    authorName?: string,
    favorited?: string,
    limit?: string,
    offset?: string,
  ) {
    const { id } = await this.prisma.user.findFirst({
      where: { userName: favorited },
      select: { id: true },
    });

    const where = {};
    if (tag) {
      where['tagList'] = { some: { tag: tag } };
    }
    if (authorName) {
      where['author'] = { userName: authorName };
    }
    if (favorited) {
      where['favoritedBy'] = { has: id };
    }
    const articles = await this.prisma.article.findMany({
      skip: offset ? parseInt(offset) : undefined,
      take: limit ? parseInt(limit) : undefined,
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tagList: { select: { tag: true } },
        author: {
          select: {
            userName: true,
            bio: true,
            image: true,
          },
        },
      },
    });
    return articles.map(({ id, authorId, favoritedBy, ...rest }) => ({
      article: rest,
    }));
  }

  // * Get User Feed Articles
  async getFeedArticles(userId: number) {
    const { followingUsers } = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        followingUsers: true,
      },
    });

    if (!followingUsers) {
      return { message: 'No feed articles!!!' };
    }

    try {
      const articles = await this.prisma.article.findMany({
        where: { authorId: { in: followingUsers } },
        include: {
          author: {
            select: { userName: true, bio: true, image: true },
          },
        },
      });

      if (articles) {
        return articles.map(
          ({ id, authorId, author, favoritedBy, ...rest }) => ({
            article: {
              ...rest,
              author: {
                ...author,
                following: true,
              },
            },
          }),
        );
      } else {
        return { message: 'No feed articles!' };
      }
    } catch (error) {
      throw new NotFoundException('Resource Not Found');
    }
  }

  // * Get Article
  async getArticle(slug: string) {
    // find article
    const article = await this.prisma.article.findFirst({
      where: { slug },
      include: {
        tagList: { select: { tag: true } },
        author: {
          select: {
            userName: true,
            bio: true,
            image: true,
          },
        },
      },
    });
    if (!article) {
      throw new NotFoundException('Resource Not Found');
    } else {
      // return article
      const { id, authorId, favoritedBy, ...rest } = article;
      return { article: rest };
    }
  }

  // * Update Article
  async updateArticle(userId: number, dto: UpdateArticleDto, slug: string) {
    // check if the article belongs to user
    const article = await this.prisma.article.findFirst({
      where: { slug, authorId: userId },
      select: { id: true },
    });
    if (article) {
      // generating slug if title is updating
      const slug = dto.title ? this.generateSlug(dto.title) : undefined;
      // let user update the article
      const updateArticle = await this.prisma.article.update({
        where: { id: article.id },
        data: { ...dto, slug },
        include: {
          tagList: { select: { tag: true } },
          author: {
            select: {
              userName: true,
              bio: true,
              image: true,
            },
          },
        },
      });
      if (updateArticle) {
        // return updated article
        const { id, authorId, favoritedBy, ...rest } = updateArticle;
        return { article: rest };
      } else {
        throw new UnprocessableEntityException(`Failed to update the article`);
      }
    } else {
      throw new ForbiddenException('Resource Not Found or You Have No Access');
    }
  }

  // * Delete Article
  async deleteArticle(slug: string, userId: number) {
    // check if the article belongs to user
    const article = await this.prisma.article.findFirst({
      where: { slug, authorId: userId },
      select: { id: true },
    });
    if (article) {
      const deletedArticle = await this.prisma.article.delete({
        where: { id: article.id },
        include: {
          tagList: { select: { tag: true } },
          author: {
            select: {
              userName: true,
              bio: true,
              image: true,
            },
          },
        },
      });
      if (!deletedArticle) {
        throw new UnprocessableEntityException(`Failed to delete the article`);
      } else {
        const { id, authorId, favoritedBy, ...rest } = deletedArticle;
        return { article: rest };
      }
    } else {
      throw new ForbiddenException('Resource Not Found or You Have No Access');
    }
  }

  //  update fav count of the article and return
  async returnArticle(
    slug: string,
    favorited: boolean,
    count: number,
    userId: number,
  ) {
    const COUNT =
      favorited === true
        ? count === 1
          ? { increment: 1 }
          : { increment: 0 }
        : count === 0
          ? { decrement: 0 }
          : { decrement: 1 };

    // update the fav count
    const article = await this.prisma.article.update({
      where: { slug },
      data: {
        favouritesCount: COUNT,
      },
      include: {
        tagList: { select: { tag: true } },
        author: {
          select: {
            userName: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    // check if user is following the author of the article
    const isFollowing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        followingUsers: {
          has: article.authorId,
        },
      },
    });
    const following = isFollowing ? true : false;

    const { id, authorId, author, favoritedBy, ...rest } = article;
    return {
      article: {
        ...rest,
        favorited,
        author: {
          ...author,
          following,
        },
      },
    };
  }

  // * Favorite Article
  async favArticle(userId: number, slug: string) {
    // fetch articleId
    const { id } = await this.prisma.article.findFirst({
      where: { slug },
      select: { id: true },
    });

    // check if article is favorited by user
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        favoriteArticles: {
          has: id,
        },
      },
    });

    const favorited = true;

    //if article is not favorited by user
    if (!user) {
      // favorite the article
      const favoritedArticle = await this.prisma.user.update({
        where: { id: userId },
        data: {
          favoriteArticles: { push: id },
        },
      });

      const favoritedBy = await this.prisma.article.update({
        where: { id },
        data: {
          favoritedBy: { push: userId },
        },
      });
      if (favoritedArticle && favoritedBy) {
        const count = 1;
        return this.returnArticle(slug, favorited, count, userId);
      }
      return new UnprocessableEntityException(`Failed to add to favorites`);
    }

    // return already favorited article
    const count = 0;
    return this.returnArticle(slug, favorited, count, userId);
  }

  // * unfavorite Article
  async unfavArticle(userId: number, slug: string) {
    // fetch articleId
    const { id, favoritedBy } = await this.prisma.article.findFirst({
      where: { slug },
      select: { id: true, favoritedBy: true },
    });

    // check if article is favorited by user
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        favoriteArticles: {
          has: id,
        },
      },
    });

    const favorited = false;

    //if article is favorited by user
    if (user) {
      // unfavorite the article
      const favoritedArticle = await this.prisma.user.update({
        where: { id: userId },
        data: {
          favoriteArticles: {
            set: user.favoriteArticles.filter((id) => id !== id),
          },
        },
      });

      const unfavoritedBy = await this.prisma.article.update({
        where: { id },
        data: {
          favoritedBy: {
            set: favoritedBy.filter((id) => id !== userId),
          },
        },
      });
      if (favoritedArticle && unfavoritedBy) {
        const count = 1;
        return this.returnArticle(slug, favorited, count, userId);
      }
      return new UnprocessableEntityException(
        `Failed to remove from favorites`,
      );
    }
    // return not favorited article
    const count = 0;
    return this.returnArticle(slug, favorited, count, userId);
  }

  // *Create Comments
  async createComment(userId: number, slug: string, dto: CreateCommentDto) {
    // get the article Id
    const { id } = await this.prisma.article.findFirst({
      where: { slug },
      select: { id: true },
    });

    // createComment
    const comment = await this.prisma.comment.create({
      data: { ...dto, articleId: id, authorId: userId },

      include: {
        author: {
          select: {
            userName: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    if (comment) {
      const { articleId, authorId, ...rest } = comment;
      return { comment: rest };
    } else {
      throw new HttpException(
        'Could not create comment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //* Get Comments
  async getComments(slug: string) {
    const { comments } = await this.prisma.article.findFirst({
      where: { slug },
      include: {
        comments: {
          include: {
            author: {
              select: {
                userName: true,
                bio: true,
                image: true,
              },
            },
          },
        },
      },
    });
    if (comments) {
      comments.map((c) => {
        delete c.authorId;
        delete c.articleId;
        return c;
      });
      return { comments: comments };
    } else {
      throw new HttpException('No comments', HttpStatus.NO_CONTENT);
    }
  }

  // * Delete Comments
  async deleteComment(userId: number, commentId: number) {
    const deletedComment = await this.prisma.comment.delete({
      where: {
        id: commentId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            userName: true,
            bio: true,
            image: true,
          },
        },
      },
    });
    if (deletedComment) {
      return { comment: deletedComment };
    } else {
      throw new HttpException(
        'Could not delete comment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
