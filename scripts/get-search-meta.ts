import { fileToPath, parseMarkdownFile, removePrefix } from '@docusaurus/utils';
import fs from 'fs';
//@ts-ignore
import toc from 'markdown-toc';
import path from 'path';
import prettier from 'prettier';
import shell from 'shelljs';
import { v4 as uuid } from 'uuid';

interface ResultType {
  content: string;
  id: string;
  url: string;
  type: 'lvl1' | 'lvl2' | 'lvl3';
  hierarchy: {
    lvl1: string | null;
    lvl2?: string | null;
    lvl3?: string | null;
  };
}

interface TOCResultItem {
  content: string;
  slug: string;
  lvl: 1 | 2 | 3;
  i: number;
  seen: number;
}

const websiteRoot = 'pages';

async function getMDXMeta(file: string) {
  const { content, frontMatter: _frontMatter } = await parseMarkdownFile(file);
  const frontMatter = _frontMatter as Record<string, any>;
  const tableOfContent = toc(content);
  const json = tableOfContent.json as TOCResultItem[];
  const slug = fileToPath(file)
    .replace(`/${websiteRoot}`, '')
    .replace(process.cwd(), '');

  const result: ResultType[] = [];

  result.push({
    content: frontMatter.title,
    id: uuid(),
    type: 'lvl1',
    url: removePrefix(slug, '/'),
    hierarchy: {
      lvl1: frontMatter.title,
    },
  });

  json.forEach((item, index) => {
    result.push({
      content: item.content,
      id: uuid(),
      type: `lvl${item.lvl}` as any,
      url: removePrefix(slug, '/') + `#${item.slug}`,
      hierarchy: {
        lvl1: frontMatter.title,
        lvl2: item.lvl === 2 ? item.content : json[index - 1]?.content ?? null,
        lvl3: item.lvl === 3 ? item.content : null,
      },
    });
  });

  return result;
}

async function getSearchMeta() {
  let json: any = [];

  const files = shell
    .ls('-R', websiteRoot)
    .map((file) => path.join(process.cwd(), websiteRoot, file))
    .filter((file) => file.endsWith('.mdx'));

  for (const file of files) {
    let result: any[] = [];
    try {
      result = await getMDXMeta(file);
      json.push(...result);
    } catch (error) {
      console.log(error);
    }
  }

  json = prettier.format(JSON.stringify(json), { parser: 'json' });
  const outPath = path.join(process.cwd(), 'configs', 'search-meta.json');
  fs.writeFileSync(outPath, json);
  console.log('Search meta is ready ✅');
}

getSearchMeta();
