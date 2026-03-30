(function attachWorkbenchRender(window) {
  const data = window.FaultWorkbenchData;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getStageState(stageId, state) {
    if (stageId < state.activeStage) return "done";
    if (stageId === state.activeStage) return "active";
    return "idle";
  }

  function canVisitStage(stageId, state) {
    if (stageId === 1) return true;
    if (stageId === 2) return state.modelLoaded && state.faultModelLoaded;
    if (stageId === 3) return state.faultConfigured;
    return false;
  }

  function getCurrentStage(state) {
    return data.stages.find((item) => item.id === state.activeStage) || data.stages[0];
  }

  function findTemplateById(templateId) {
    return Object.values(data.templates)
      .flat()
      .find((item) => item.id === templateId) || null;
  }

  function findNodeById(nodeId) {
    return data.nodes.find((item) => item.id === nodeId) || null;
  }

  function getTargetLabel(targetId) {
    const target = data.targetOptions.find((item) => item.id === targetId);
    return target ? target.label : "未设置";
  }

  function getStatusMeta(state) {
    if (!state.modelLoaded) return { text: "等待导入系统模型", dot: "is-busy" };
    if (!state.faultModelLoaded) return { text: "系统模型已加载，等待导入故障模型", dot: "is-warn" };
    if (!state.faultConfigured) return { text: "故障模型已导入，等待故障建模", dot: "is-busy" };
    return { text: "故障建模已完成，可进入仿真分析", dot: "is-ready" };
  }

  function getCanvasAction(state) {
    if (!state.modelLoaded) {
      return { label: "导入系统模型", action: "import-system", tone: "primary" };
    }
    if (state.activeStage === 1) {
      return { label: "保存系统模型", action: "save-system", tone: "secondary" };
    }
    if (state.activeStage === 2 && !state.faultModelLoaded) {
      return { label: "导入故障模型", action: "import-fault", tone: "primary" };
    }
    if (state.activeStage === 2) {
      return { label: "故障建模", action: "start-modeling", tone: "primary" };
    }
    if (state.activeStage === 3) {
      return { label: "查看仿真波形", action: "open-analysis", tone: "primary" };
    }
    return null;
  }

  function renderStageTabs(state) {
    return data.stages
      .map((stage) => {
        const status = getStageState(stage.id, state);
        const classes = ["stage-tab"];
        if (status === "active") classes.push("is-active");
        if (status === "done") classes.push("is-done");
        const disabled = !canVisitStage(stage.id, state) && status === "idle";
        return `
          <button type="button" class="${classes.join(" ")}" data-stage="${stage.id}" ${disabled ? "disabled" : ""}>
            <span class="stage-tab__num">${stage.id}</span>
            <span>
              <span class="stage-tab__title">${escapeHtml(stage.title)}</span>
              <span class="stage-tab__meta">${escapeHtml(stage.meta)}</span>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderToolbar(state) {
    return data.toolbarActions
      .map((item) => {
        const disabled =
          (item.id === "import-fault" && !state.modelLoaded) ||
          (item.id === "save-system" && !state.modelLoaded) ||
          (item.id === "save-result" && !state.faultConfigured);
        const isActive =
          (item.id === "import-system" && state.activeStage === 1) ||
          (item.id === "import-fault" && state.activeStage === 2) ||
          (item.id === "save-result" && state.activeStage === 3);
        const classes = ["toolbar-btn"];
        if (item.primary) classes.push("is-primary");
        if (isActive) classes.push("is-active");
        return `
          <button type="button" class="${classes.join(" ")}" data-action="${item.id}" ${disabled ? "disabled" : ""}>
            <span class="toolbar-btn__icon">${escapeHtml(item.icon)}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderOverviewCards(state) {
    const stage = getCurrentStage(state);
    const cards = [
      {
        label: "当前阶段",
        value: stage.title,
        meta: stage.lead,
      },
      {
        label: "布局重点",
        value: stage.meta,
        meta: stage.layout,
      },
      {
        label: "当前资产",
        value: `${state.modelLoaded ? "系统已导入" : "系统未导入"} / ${state.faultModelLoaded ? "故障已导入" : "故障未导入"}`,
        meta: `组件 ${data.nodes.length} 个，连接线 ${data.links.length} 条，模板 ${state.selectedTemplateIds.length} 个。`,
      },
      {
        label: "下一步",
        value: state.faultConfigured ? "可进入仿真分析" : "继续调整布局",
        meta: stage.next,
      },
    ];

    return cards
      .map(
        (card) => `
          <article class="summary-card">
            <p class="summary-card__label">${escapeHtml(card.label)}</p>
            <p class="summary-card__value">${escapeHtml(card.value)}</p>
            <p class="summary-card__meta">${escapeHtml(card.meta)}</p>
          </article>
        `
      )
      .join("");
  }

  function renderLibrary() {
    return data.librarySections
      .map(
        (section) => `
          <section class="library-group">
            <h4 class="library-group__title">${escapeHtml(section.title)}</h4>
            ${section.items
              .map(
                (item) => `
                  <article class="library-item">
                    <span class="library-dot" style="background:${item.color}"></span>
                    <div>
                      <p class="library-item__name">${escapeHtml(item.name)}</p>
                      <p class="library-item__meta">${escapeHtml(item.meta)}</p>
                    </div>
                  </article>
                `
              )
              .join("")}
          </section>
        `
      )
      .join("");
  }

  function renderLegend() {
    const items = [
      { label: "普通连接线", color: "#94a3b8" },
      { label: "CAN 总线", color: "#1d4ed8" },
      { label: "测量链路", color: "#16a34a" },
    ];
    return items
      .map(
        (item) => `
          <span class="legend-chip">
            <span class="legend-chip__dot" style="background:${item.color}"></span>
            ${escapeHtml(item.label)}
          </span>
        `
      )
      .join("");
  }

  function renderCanvas(state) {
    const action = getCanvasAction(state);

    if (!state.modelLoaded) {
      return `
        <div class="canvas-surface">
          <div class="canvas-empty">
            <div class="canvas-empty__card">
              <div class="canvas-empty__icon">FI</div>
              <h4>先确定系统建模布局</h4>
              <p>这一版先围绕布局整理工作台。先导入系统模型，再继续确定故障注入页和仿真分析页的版式结构。</p>
              ${action ? `<div class="canvas-actions"><button type="button" class="canvas-btn is-${action.tone}" data-action="${action.action}">${escapeHtml(action.label)}</button></div>` : ""}
            </div>
          </div>
        </div>
      `;
    }

    const stage = getCurrentStage(state);
    const selectedTemplateNames = state.selectedTemplateIds
      .map((templateId) => findTemplateById(templateId))
      .filter(Boolean)
      .map((item) => item.name)
      .join(" / ");

    return `
      <div class="canvas-surface">
        <svg width="100%" height="100%" viewBox="0 0 1040 560" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="arrow-line" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#94a3b8"></path>
            </marker>
            <marker id="arrow-can" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#1d4ed8"></path>
            </marker>
            <marker id="arrow-measure" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#16a34a"></path>
            </marker>
          </defs>
          ${data.links
            .map(
              (link) => `
                <path
                  class="diagram-link"
                  d="${link.d}"
                  stroke="${link.stroke}"
                  marker-end="url(#arrow-${link.marker})"
                  ${link.dash ? `stroke-dasharray="${link.dash}"` : ""}
                ></path>
              `
            )
            .join("")}
        </svg>

        ${data.laneLabels.map((lane) => `<div class="canvas-lane-label" style="left:${lane.x}px">${escapeHtml(lane.text)}</div>`).join("")}
        ${data.laneDividers.map((x) => `<div class="canvas-divider" style="left:${x}px"></div>`).join("")}

        <aside class="canvas-overlay-card">
          <p class="canvas-overlay-card__label">当前页面</p>
          <h4>${escapeHtml(stage.title)}</h4>
          <p>${escapeHtml(stage.lead)}</p>
          <div class="canvas-flow">
            <span class="flow-chip">${state.modelLoaded ? "系统模型已导入" : "系统模型未导入"}</span>
            <span class="flow-chip">${state.faultModelLoaded ? "故障模型已导入" : "故障模型未导入"}</span>
            <span class="flow-chip">${state.faultConfigured ? "故障建模已完成" : "故障建模未完成"}</span>
          </div>
          ${selectedTemplateNames ? `<div class="canvas-flow"><span class="flow-chip">${escapeHtml(selectedTemplateNames)}</span></div>` : ""}
          ${action ? `<div class="canvas-actions"><button type="button" class="canvas-btn is-${action.tone}" data-action="${action.action}">${escapeHtml(action.label)}</button></div>` : ""}
        </aside>

        ${data.nodes
          .map((node) => {
            const classes = ["diagram-block"];
            if (state.selectedNodeId === node.id) classes.push("is-selected");
            if (state.faultedNodeIds.includes(node.id)) classes.push("is-faulted");
            return `
              <button
                type="button"
                class="${classes.join(" ")}"
                data-node="${node.id}"
                data-kind="${node.kind}"
                style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px"
              >
                ${state.faultedNodeIds.includes(node.id) ? '<span class="diagram-badge">Fault</span>' : ""}
                <span class="diagram-block__title">${escapeHtml(node.title)}</span>
                <span class="diagram-block__meta">${escapeHtml(node.subtitle)}</span>
                ${node.id === "scope" && state.activeStage === 3 ? '<span class="scope-chip">查看波形</span>' : ""}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderInspector(state) {
    const node = findNodeById(state.selectedNodeId);
    const action = getCanvasAction(state);

    if (!node) {
      return `
        <div class="inspector-empty">
          <div>
            <div class="inspector-empty__icon">i</div>
            <p>当前先校准布局。点击中间组件查看信息，或使用当前阶段的入口按钮继续推进页面结构。</p>
            ${action ? `<button type="button" class="inspector-action" data-action="${action.action}">${escapeHtml(action.label)}</button>` : ""}
          </div>
        </div>
      `;
    }

    const faulted = state.faultedNodeIds.includes(node.id);
    const rows = [
      ["名称", node.props.name],
      ["类型", node.props.type],
      ["型号", node.props.model],
      ["输出接口", node.props.output],
      ["更新频率", node.props.rate],
      ["总线类型", node.props.bus],
    ];

    return `
      <section class="inspector-group">
        <h4 class="inspector-group__title">组件属性</h4>
        ${rows
          .map(
            ([key, value]) => `
              <div class="inspector-row">
                <span class="inspector-key">${escapeHtml(key)}</span>
                <span class="inspector-value">${escapeHtml(value)}</span>
              </div>
            `
          )
          .join("")}
      </section>

      <section class="inspector-group">
        <h4 class="inspector-group__title">建模状态</h4>
        <div class="inspector-row">
          <span class="inspector-key">系统模型</span>
          <span class="inspector-value ${state.modelLoaded ? "is-success" : ""}">${state.modelLoaded ? "已导入" : "未导入"}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">故障模型</span>
          <span class="inspector-value ${state.faultModelLoaded ? "is-success" : ""}">${state.faultModelLoaded ? "已导入" : "未导入"}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">故障状态</span>
          <span class="inspector-value ${faulted ? "is-danger" : "is-success"}">${faulted ? "已注入" : "正常"}</span>
        </div>
      </section>

      ${action ? `<button type="button" class="inspector-action" data-action="${action.action}">${escapeHtml(action.label)}</button>` : ""}
      ${state.activeStage === 3 ? '<button type="button" class="inspector-action" data-action="open-analysis">打开仿真分析</button>' : ""}
    `;
  }

  function renderStatus(state) {
    const status = getStatusMeta(state);
    return `
      <span class="status-item"><span class="status-dot ${status.dot}"></span><strong>${escapeHtml(status.text)}</strong></span>
      <span class="status-item">当前页签 <strong>${escapeHtml(getCurrentStage(state).title)}</strong></span>
      <span class="status-item">系统模型 <strong>${state.modelLoaded ? "已导入" : "未导入"}</strong></span>
      <span class="status-item">故障模型 <strong>${state.faultModelLoaded ? "已导入" : "未导入"}</strong></span>
      <span class="status-item">目标 <strong>${escapeHtml(getTargetLabel(state.config.targetId))}</strong></span>
    `;
  }

  function renderTemplateDialog(state) {
    const category = state.activeTemplateCategory;
    const currentList = data.templates[category] || [];
    const detailTemplate = findTemplateById(state.previewTemplateId) || currentList[0];

    return `
      <div class="dialog-overlay template-dialog" data-close-modal>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="故障建模">
          <div class="dialog__head">
            <div>
              <p class="dialog__eyebrow">故障注入页面</p>
              <h3 class="dialog__title">故障建模</h3>
              <p class="dialog__desc">这一版先确定故障注入页的布局。这里保留模板列表、详情区和确认按钮，后面再补更细的参数联动。</p>
            </div>
            <button type="button" class="dialog__close" data-action="close-modal">×</button>
          </div>
          <div class="dialog__body">
            <aside class="template-side">
              <h4 class="template-side__title">故障层级</h4>
              ${data.templateCategories
                .map(
                  (item) => `
                    <button type="button" class="template-category ${item.id === category ? "is-active" : ""}" data-template-category="${item.id}">
                      <span>${escapeHtml(item.label)}</span>
                      <span class="template-count">${item.count}</span>
                    </button>
                  `
                )
                .join("")}
              <section class="template-selected">
                <h4 class="template-side__title">已选模板</h4>
                <div class="template-selected__list">
                  ${
                    state.selectedTemplateIds.length
                      ? state.selectedTemplateIds
                          .map((templateId) => findTemplateById(templateId))
                          .filter(Boolean)
                          .map((item) => `<div class="template-selected__item">${escapeHtml(item.name)}</div>`)
                          .join("")
                      : '<div class="template-selected__item">暂无已选模板</div>'
                  }
                </div>
              </section>
            </aside>

            <section class="template-grid">
              ${currentList
                .map((item) => {
                  const selected = state.selectedTemplateIds.includes(item.id);
                  return `
                    <article class="template-card ${selected ? "is-selected" : ""}" data-template-id="${item.id}">
                      <h4 class="template-card__title">${escapeHtml(item.name)}</h4>
                      <p class="template-card__desc">${escapeHtml(item.desc)}</p>
                      <div class="template-tags">
                        ${item.tags.map((tag) => `<span class="template-tag">${escapeHtml(tag)}</span>`).join("")}
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </section>

            <aside class="template-detail">
              <h4 class="template-detail__title">模板详情</h4>
              ${
                detailTemplate
                  ? `
                    <h5 class="template-detail__headline">${escapeHtml(detailTemplate.name)}</h5>
                    <p class="template-detail__copy">${escapeHtml(detailTemplate.desc)}</p>
                    <div class="detail-pair">
                      <p class="detail-pair__label">适用范围</p>
                      <p class="detail-pair__value">${escapeHtml(detailTemplate.scope)}</p>
                    </div>
                    <div class="detail-pair">
                      <p class="detail-pair__label">幅值范围</p>
                      <p class="detail-pair__value">${escapeHtml(detailTemplate.amplitude)}</p>
                    </div>
                    <div class="detail-pair">
                      <p class="detail-pair__label">典型场景</p>
                      <p class="detail-pair__value">${escapeHtml(detailTemplate.scene)}</p>
                    </div>
                  `
                  : '<p class="template-detail__copy">请先从列表选择一个模板。</p>'
              }
            </aside>
          </div>
          <div class="dialog__foot">
            <p class="dialog__meta">已选择 ${state.selectedTemplateIds.length} 个模板</p>
            <button type="button" class="dialog-btn" data-action="close-modal">取消</button>
            <button type="button" class="dialog-btn dialog-btn--primary" data-action="confirm-modeling">确认建模</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderScopeDialog(state) {
    return `
      <div class="dialog-overlay scope-dialog" data-close-modal>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="仿真分析">
          <div class="dialog__head">
            <div>
              <p class="dialog__eyebrow">仿真分析页面</p>
              <h3 class="dialog__title">波形对比与结果输出</h3>
              <p class="dialog__desc">这一版先保留分析区的布局和波形占位，后续再补更细的仿真配置与结果指标。</p>
            </div>
            <button type="button" class="dialog__close" data-action="close-modal">×</button>
          </div>
          <div class="dialog__body">
            <div class="scope-toolbar">
              <button type="button" class="scope-toolbar__btn">刷新波形</button>
              <button type="button" class="scope-toolbar__btn ${state.compareMode ? "is-active" : ""}" data-action="toggle-compare">
                ${state.compareMode ? "关闭对比" : "开启对比"}
              </button>
              <button type="button" class="scope-toolbar__btn" data-action="save-result">保存仿真结果</button>
              <span class="scope-toolbar__meta">采样率 64 kHz · 时间窗 0 ~ ${escapeHtml(String(state.config.total))} s</span>
            </div>
            <div class="scope-panels">
              <section class="scope-panel">
                <span class="scope-panel__label">CH1 · IMU Ax 时域波形</span>
                <canvas id="scopeCanvasTime"></canvas>
              </section>
              <section class="scope-panel">
                <span class="scope-panel__label">CH2 · 频域能量分布</span>
                <canvas id="scopeCanvasFreq"></canvas>
              </section>
            </div>
          </div>
          <div class="dialog__foot">
            <p class="dialog__meta">${escapeHtml(getTargetLabel(state.config.targetId))} · ${escapeHtml(state.config.faultType)}</p>
            <button type="button" class="dialog-btn" data-action="close-modal">关闭</button>
            <button type="button" class="dialog-btn dialog-btn--success" data-action="save-result">保存仿真结果</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDialog(state) {
    if (state.modal === "templates") return renderTemplateDialog(state);
    if (state.modal === "scope") return renderScopeDialog(state);
    return "";
  }

  function renderConfigSummary(state) {
    return `
      <div class="config-summary__row">
        <span class="config-summary__label">目标组件</span>
        <span class="config-summary__value">${escapeHtml(getTargetLabel(state.config.targetId))}</span>
      </div>
      <div class="config-summary__row">
        <span class="config-summary__label">故障类型</span>
        <span class="config-summary__value">${escapeHtml(state.config.faultType)}</span>
      </div>
    `;
  }

  function drawTimelinePreview() {}

  function drawScopeCharts(state) {
    drawTimeChart(state);
    drawFrequencyChart(state);
  }

  function drawTimeChart(state) {
    const canvas = document.getElementById("scopeCanvasTime");
    if (!canvas) return;
    const width = canvas.offsetWidth || 900;
    const height = canvas.offsetHeight || 320;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(140, 169, 215, 0.35)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const mid = height / 2;
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      const t = (x / width) * state.config.total;
      const y = mid - Math.sin(t * 2.3) * 26 - Math.cos(t * 0.8) * 10;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (!state.compareMode) return;

    const startX = (state.config.start / state.config.total) * width;
    const endX = ((state.config.start + state.config.duration) / state.config.total) * width;
    ctx.fillStyle = "rgba(220, 38, 38, 0.06)";
    ctx.fillRect(startX, 0, Math.max(0, endX - startX), height);

    ctx.strokeStyle = "#dc2626";
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      const t = (x / width) * state.config.total;
      let y = mid - Math.sin(t * 2.3) * 26 - Math.cos(t * 0.8) * 10;
      if (t >= state.config.start && t <= state.config.start + state.config.duration) {
        y += state.config.faultType.indexOf("漂移") > -1 ? (t - state.config.start) * 8 : state.config.magnitude * 30;
      }
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawFrequencyChart(state) {
    const canvas = document.getElementById("scopeCanvasFreq");
    if (!canvas) return;
    const width = canvas.offsetWidth || 900;
    const height = canvas.offsetHeight || 200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(140, 169, 215, 0.32)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const count = 28;
    const barWidth = width / count - 4;
    for (let i = 0; i < count; i += 1) {
      const baseHeight = (Math.exp(-(i / count) * 2.8) * 0.76 + 0.04) * height;
      const x = i * (width / count) + 2;
      const y = height - baseHeight;
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.12)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, baseHeight);
      if (state.compareMode) {
        const extra = i < 7 ? baseHeight * 0.52 : baseHeight * 0.08;
        ctx.fillStyle = "rgba(220, 38, 38, 0.28)";
        ctx.fillRect(x, y - extra, barWidth, extra);
      }
    }
  }

  function updateInspectorTag(state) {
    const tag = document.getElementById("inspectorTag");
    if (!tag) return;
    const node = findNodeById(state.selectedNodeId);
    tag.textContent = node ? node.title : "未选中";
  }

  function showToast(element, message, kind) {
    if (!element) return;
    element.textContent = message;
    element.className = `toast is-open ${kind === "success" ? "is-success" : "is-warning"}`;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      element.className = "toast";
    }, 2600);
  }

  window.FaultWorkbenchRender = {
    canVisitStage,
    findNodeById,
    findTemplateById,
    getCurrentStage,
    getTargetLabel,
    renderStageTabs,
    renderToolbar,
    renderOverviewCards,
    renderLibrary,
    renderLegend,
    renderCanvas,
    renderInspector,
    renderStatus,
    renderDialog,
    renderConfigSummary,
    drawTimelinePreview,
    drawScopeCharts,
    showToast,
    updateInspectorTag,
  };
})(window);
