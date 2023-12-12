import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';
import { CreateArticleDto, CreateCommentDto, UpdateArticleDto } from './dto';

@Controller('articles')
export class ArticleController {
  constructor(private articleService: ArticleService) {}

  // articles;
  @Get()
  getArticles(
    @Query('tag') tag?: string,
    @Query('author') authorName?: string,
    @Query('favorited') favorited?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.articleService.getArticles(
      tag,
      authorName,
      favorited,
      limit,
      offset,
    );
  }

  @UseGuards(JwtGuard)
  @Get('feed')
  getFeedArticles(@GetUser('id') userId: number) {
    return this.articleService.getFeedArticles(userId);
  }

  @Get(':slug')
  getArticle(@Param('slug') slug: string) {
    return this.articleService.getArticle(slug);
  }

  @UseGuards(JwtGuard)
  @Post()
  createArticle(@GetUser('id') userId: number, @Body() dto: CreateArticleDto) {
    return this.articleService.createArticle(userId, dto);
  }

  @UseGuards(JwtGuard)
  @Put(':slug')
  updateArticle(
    @Param('slug') slug: string,
    @GetUser('id') userId: number,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articleService.updateArticle(userId, dto, slug);
  }

  @UseGuards(JwtGuard)
  @Delete(':slug')
  deleteArticle(@Param('slug') slug: string, @GetUser('id') userId: number) {
    return this.articleService.deleteArticle(slug, userId);
  }

  @UseGuards(JwtGuard)
  @Post(':slug/favorite')
  favoriteArticle(@Param('slug') slug: string, @GetUser('id') userId: number) {
    return this.articleService.favArticle(userId, slug);
  }

  @UseGuards(JwtGuard)
  @Delete(':slug/favorite')
  unfavoriteArticle(
    @Param('slug') slug: string,
    @GetUser('id') userId: number,
  ) {
    return this.articleService.unfavArticle(userId, slug);
  }

  // comments
  @UseGuards(JwtGuard)
  @Post(':slug/comments')
  createComment(
    @Param('slug') slug: string,
    @GetUser('id') userId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.articleService.createComment(userId, slug, dto);
  }

  @Get(':slug/comments')
  getComments(@Param('slug') slug: string) {
    return this.articleService.getComments(slug);
  }

  @UseGuards(JwtGuard)
  @Delete(':slug/comments/:id')
  deleteComments(
    @Param('id', ParseIntPipe) commentId: number,
    @GetUser('id') userId: number,
  ) {
    return this.articleService.deleteComment(userId, commentId);
  }
}
