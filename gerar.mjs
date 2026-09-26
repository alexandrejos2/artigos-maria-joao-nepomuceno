#!/usr/bin/env node
/**
 * Gera o artigos.json a partir dos ficheiros em artigos/.
 * Corre-se antes de cada commit:  node gerar.mjs
 *
 * Cada artigo é um ficheiro artigos/<slug>.md com um cabeçalho entre --- e o texto:
 *
 *   ---
 *   titulo: O título que aparece no artigo
 *   titulo_seo: (opcional) um título mais curto para o separador e o Google
 *   descricao: A frase que aparece nos resultados de pesquisa, até 155 caracteres
 *   data: 2026-09-25
 *   capa: (opcional) imagens/<slug>.jpg
 *   ---
 *
 *   Parágrafos separados por uma linha em branco. "## " no início de uma linha faz um
 *   subtítulo; linhas começadas por "- " ou "1. " fazem listas.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ficheiros = (await readdir('artigos')).filter((f) => f.endsWith('.md')).sort();
const artigos = [];

for (const f of ficheiros) {
  const slug = f.slice(0, -3);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`${f}: o nome do ficheiro só pode ter letras minúsculas, números e hífenes`);
  const bruto = (await readFile(`artigos/${f}`, 'utf8')).replace(/\r\n/g, '\n');
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${f}: falta o cabeçalho entre ---`);

  const meta = {};
  for (const linha of m[1].split('\n')) {
    const i = linha.indexOf(':');
    if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  for (const campo of ['titulo', 'descricao', 'data']) {
    if (!meta[campo]) throw new Error(`${f}: falta "${campo}" no cabeçalho`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.data)) throw new Error(`${f}: a data tem de ser AAAA-MM-DD`);
  if (meta.capa && !existsSync(meta.capa)) throw new Error(`${f}: a capa ${meta.capa} não existe`);

  const corpo = m[2].trim();
  if (!corpo) throw new Error(`${f}: o texto está vazio`);

  artigos.push({
    slug,
    titulo: meta.titulo,
    titulo_seo: meta.titulo_seo || null,
    descricao: meta.descricao,
    data: meta.data,
    capa: meta.capa || null,
    corpo,
  });
}

artigos.sort((a, b) => b.data.localeCompare(a.data));
await writeFile('artigos.json', JSON.stringify({ artigos }, null, 2) + '\n');
console.log(`artigos.json: ${artigos.length} artigo(s)`);
