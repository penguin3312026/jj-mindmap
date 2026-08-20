-- 管理方格测评 · Supabase 初始化
-- 在 Supabase 控制台 → SQL Editor 里一次性执行本文件

create table if not exists quiz_submissions (
  id bigint generated always as identity primary key,
  token text unique not null,
  name text,
  answers jsonb,
  p integer,
  h integer,
  pc real,
  hc real,
  pt text,
  ht text,
  type text,
  weak text,
  advice jsonb,
  created_at timestamptz default now()
);

-- 开启行级安全（RLS）
alter table quiz_submissions enable row level security;

-- 匿名可插入：参会者答题提交
drop policy if exists "anon insert" on quiz_submissions;
create policy "anon insert" on quiz_submissions
  for insert to anon with check (true);

-- 匿名可读取：主持人汇总 / 按 token 回看
drop policy if exists "anon select" on quiz_submissions;
create policy "anon select" on quiz_submissions
  for select to anon using (true);

-- 清空函数：SECURITY DEFINER，口令在服务端再校验一次
-- 口令需与前端 quiz-config.js 里的 HOST_PASSCODE 保持一致（默认 hcss2026）
create or replace function clear_quiz_submissions(p_passcode text)
returns void language plpgsql security definer as $$
begin
  if p_passcode is distinct from 'hcss2026' then
    raise exception '口令不正确';
  end if;
  -- 必须带 WHERE 子句，否则触发 Supabase「DELETE requires a WHERE clause」保护
  delete from quiz_submissions where id is not null;
end;
$$;

-- 允许匿名执行清空函数
grant execute on function clear_quiz_submissions(text) to anon;
