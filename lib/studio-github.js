const API_ROOT = "https://api.github.com";

function config() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  const repository = process.env.GITHUB_CONTENT_REPOSITORY || "Junkyung-b-l-s/junkyung-kim-blog";

  if (!token) throw new Error("GITHUB_CONTENT_TOKEN이 설정되지 않았습니다.");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error("GITHUB_CONTENT_REPOSITORY 형식이 올바르지 않습니다.");
  }

  return { token, repository };
}

async function github(pathname, options = {}) {
  const { token, repository } = config();
  const response = await fetch(`${API_ROOT}/repos/${repository}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub 요청이 실패했습니다. (${response.status})`);
  }

  return response.json();
}

async function pathExists(pathname) {
  const { token, repository } = config();
  const response = await fetch(
    `${API_ROOT}/repos/${repository}/contents/${encodeURI(pathname)}?ref=main`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`GitHub 파일 확인이 실패했습니다. (${response.status})`);
  return true;
}

async function commitFiles({ title, files, action }) {
  for (const file of files) {
    const exists = await pathExists(file.path);
    if (action === "create" && exists) {
      throw new Error(`${file.path} 파일이 이미 존재합니다.`);
    }
    if (action === "update" && !exists) {
      throw new Error(`${file.path} 파일을 찾지 못했습니다.`);
    }
  }

  const reference = await github("/git/ref/heads/main");
  const parentSha = reference.object.sha;
  const parentCommit = await github(`/git/commits/${parentSha}`);

  const blobs = await Promise.all(
    files.map((file) =>
      github("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      }),
    ),
  );

  const tree = await github("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: files.map((file, index) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blobs[index].sha,
      })),
    }),
  });

  const commit = await github("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: `${action === "update" ? "Update" : "Publish"} ${title}`,
      tree: tree.sha,
      parents: [parentSha],
    }),
  });

  await github("/git/refs/heads/main", {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  const { repository } = config();
  return {
    sha: commit.sha,
    commitUrl: `https://github.com/${repository}/commit/${commit.sha}`,
  };
}

export function publishFiles({ title, files }) {
  return commitFiles({ title, files, action: "create" });
}

export function updateFiles({ title, files }) {
  return commitFiles({ title, files, action: "update" });
}

export async function assertSlugAvailable(slug, excludePath = "") {
  const entries = await github("/contents/content/published?ref=main");
  const markdownFiles = entries.filter(
    (entry) =>
      entry.type === "file" &&
      entry.name.endsWith(".md") &&
      entry.path !== excludePath,
  );
  const blobs = await Promise.all(
    markdownFiles.map((entry) => github(`/git/blobs/${entry.sha}`)),
  );

  const duplicate = blobs.some((blob) => {
    const content = Buffer.from(blob.content, "base64").toString("utf8");
    return new RegExp(`^slug:\\s*["']?${slug}["']?\\s*$`, "m").test(content);
  });

  if (duplicate) throw new Error(`슬러그 ${slug}은 이미 사용 중입니다.`);
}
