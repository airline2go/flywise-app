import { buildBlogPostMetadata, BlogPostPageBody } from '../../../../lib/render-blog-post';

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return buildBlogPostMetadata(slug, 'de');
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <BlogPostPageBody slug={slug} lang="de" />;
}
