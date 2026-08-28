(() => {
  const dataUrl = "portfolio-data.json";
  const featuredGrid = document.querySelector("#featuredGrid");
  const workGrid = document.querySelector("#workGrid");
  const filters = document.querySelector("#filters");
  const resultCount = document.querySelector(".resultCount");
  const featuredTotal = document.querySelector("#featuredTotal");
  const archiveTotal = document.querySelector("#archiveTotal");

  let works = [];
  let activeCategory = "전체";

  function getVideoId(item) {
    if (item.videoId) return item.videoId;

    try {
      const url = new URL(item.url);
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || "";
      }
      return url.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }

  function getThumbnail(item, featured = false) {
    const videoId = getVideoId(item);
    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/${featured ? "maxresdefault" : "hqdefault"}.jpg`;
    }
    return item.thumbnail || "";
  }

  function setImageFallback(image, item) {
    const videoId = getVideoId(item);
    if (!videoId) return;
    image.addEventListener("error", () => {
      image.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }, { once: true });
  }

  function createFeature(item, index) {
    const link = document.createElement("a");
    link.className = `feature feature-${index + 1}`;
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";

    const media = document.createElement("span");
    media.className = "featureMedia";

    const image = document.createElement("img");
    image.src = getThumbnail(item, true);
    image.alt = `${item.title} 영상 썸네일`;
    image.loading = index < 2 ? "eager" : "lazy";
    setImageFallback(image, item);

    const itemIndex = document.createElement("span");
    itemIndex.className = "featureIndex";
    itemIndex.textContent = String(index + 1).padStart(2, "0");

    const watch = document.createElement("span");
    watch.className = "watchLabel";
    watch.textContent = "PLAY ↗";

    const meta = document.createElement("span");
    meta.className = "featureMeta";

    const category = document.createElement("span");
    category.textContent = [item.category, item.format].filter(Boolean).join(" · ");

    const title = document.createElement("strong");
    title.textContent = item.title;

    media.append(image, itemIndex, watch);
    meta.append(category, title);
    link.append(media, meta);
    return link;
  }

  function createCard(item, index) {
    const link = document.createElement("a");
    link.className = "card";
    link.dataset.category = item.category;
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";

    const thumb = document.createElement("span");
    thumb.className = "thumb";

    const image = document.createElement("img");
    image.src = getThumbnail(item);
    image.alt = `${item.title} 영상 썸네일`;
    image.loading = "lazy";
    setImageFallback(image, item);

    const itemIndex = document.createElement("span");
    itemIndex.className = "cardIndex";
    itemIndex.textContent = String(index + 1).padStart(2, "0");

    const meta = document.createElement("span");
    meta.className = "meta";

    const metaTop = document.createElement("span");
    metaTop.className = "metaTop";

    const category = document.createElement("span");
    category.textContent = item.category;

    const format = document.createElement("span");
    format.textContent = item.format || "Video Editing";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const action = document.createElement("span");
    action.className = "cardAction";
    action.textContent = "영상 보기 ↗";

    thumb.append(image, itemIndex);
    metaTop.append(category, format);
    meta.append(metaTop, title, action);
    link.append(thumb, meta);
    return link;
  }

  function renderWorks() {
    const filtered = activeCategory === "전체"
      ? works
      : works.filter((item) => item.category === activeCategory);

    workGrid.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "dataState";
      empty.textContent = "이 카테고리에 등록된 작업이 없습니다.";
      workGrid.append(empty);
    } else {
      filtered.forEach((item) => {
        workGrid.append(createCard(item, works.indexOf(item)));
      });
    }
    resultCount.textContent = `${String(filtered.length).padStart(2, "0")} PROJECTS`;
  }

  function selectCategory(category) {
    activeCategory = category;
    filters.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.filter === category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderWorks();
  }

  function renderFilters(categories) {
    filters.replaceChildren();
    ["전체", ...categories].forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.filter = category;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.classList.toggle("active", category === activeCategory);
      button.addEventListener("click", () => selectCategory(category));
      filters.append(button);
    });
  }

  function showLoadError() {
    [featuredGrid, workGrid].forEach((container) => {
      const error = document.createElement("p");
      error.className = "dataState";
      error.textContent = "작업 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      container.replaceChildren(error);
    });
    resultCount.textContent = "00 PROJECTS";
  }

  async function loadPortfolio() {
    try {
      const response = await fetch(`${dataUrl}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Portfolio data request failed: ${response.status}`);

      const data = await response.json();
      works = (Array.isArray(data.works) ? data.works : [])
        .filter((item) => item.visible !== false && item.url && item.title);

      const featured = works
        .filter((item) => Number.isInteger(item.featuredOrder) && item.featuredOrder > 0)
        .sort((a, b) => a.featuredOrder - b.featuredOrder)
        .slice(0, 5);

      const preferredCategories = Array.isArray(data.categories) ? data.categories : [];
      const categorySet = new Set(works.map((item) => item.category).filter(Boolean));
      const categories = [
        ...preferredCategories.filter((category) => categorySet.has(category)),
        ...[...categorySet].filter((category) => !preferredCategories.includes(category)),
      ];

      featuredGrid.replaceChildren(...featured.map(createFeature));
      renderFilters(categories);
      renderWorks();
      featuredTotal.textContent = String(featured.length).padStart(2, "0");
      archiveTotal.textContent = String(works.length).padStart(2, "0");
    } catch (error) {
      console.error(error);
      showLoadError();
    }
  }

  loadPortfolio();
})();
