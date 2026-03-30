(function bootstrapWorkbench(window, document) {
  const data = window.FaultWorkbenchData;
  const render = window.FaultWorkbenchRender;

  const state = JSON.parse(JSON.stringify(data.initialState));
  const refs = {};
  const libraryCount = data.librarySections.reduce((sum, section) => sum + section.items.length, 0);

  function cacheRefs() {
    refs.stageTabs = document.getElementById("stageTabs");
    refs.toolbarActions = document.getElementById("toolbarActions");
    refs.workspaceLead = document.getElementById("workspaceLead");
    refs.overviewCards = document.getElementById("overviewCards");
    refs.libraryCount = document.getElementById("libraryCount");
    refs.libraryPanel = document.getElementById("libraryPanel");
    refs.canvasTitle = document.getElementById("canvasTitle");
    refs.canvasLegend = document.getElementById("canvasLegend");
    refs.canvasStage = document.getElementById("canvasStage");
    refs.inspectorPanel = document.getElementById("inspectorPanel");
    refs.statusBar = document.getElementById("statusBar");
    refs.dialogRoot = document.getElementById("dialogRoot");
    refs.toast = document.getElementById("toast");
  }

  function syncView() {
    const currentStage = render.getCurrentStage(state);
    refs.stageTabs.innerHTML = render.renderStageTabs(state);
    refs.toolbarActions.innerHTML = render.renderToolbar(state);
    refs.workspaceLead.textContent = currentStage.lead;
    refs.overviewCards.innerHTML = render.renderOverviewCards(state);
    refs.libraryCount.textContent = `${libraryCount} 项`;
    refs.libraryPanel.innerHTML = render.renderLibrary();
    refs.canvasTitle.textContent = currentStage.canvasTitle;
    refs.canvasLegend.innerHTML = render.renderLegend();
    refs.canvasStage.innerHTML = render.renderCanvas(state);
    refs.inspectorPanel.innerHTML = render.renderInspector(state);
    refs.statusBar.innerHTML = render.renderStatus(state);
    refs.dialogRoot.innerHTML = render.renderDialog(state);
    render.updateInspectorTag(state);

    if (state.modal === "scope") {
      window.requestAnimationFrame(() => render.drawScopeCharts(state));
    }
  }

  function toast(message, kind) {
    render.showToast(refs.toast, message, kind);
  }

  function resetSystemState() {
    state.activeStage = 1;
    state.modelLoaded = true;
    state.faultModelLoaded = false;
    state.faultConfigured = false;
    state.selectedNodeId = "fcu";
    state.selectedTemplateIds = [];
    state.previewTemplateId = "bias-imu";
    state.activeTemplateCategory = "physical";
    state.activeLayer = "物理层";
    state.faultedNodeIds = [];
    state.compareMode = false;
    state.modal = null;
    state.config = JSON.parse(JSON.stringify(data.initialState.config));
  }

  function importSystemModel() {
    resetSystemState();
    syncView();
    toast("系统模型已导入，系统故障传播建模画布已就绪。", "success");
  }

  function importFaultModel() {
    if (!state.modelLoaded) {
      toast("请先导入系统模型，再导入故障模型。", "warning");
      return;
    }
    state.activeStage = 2;
    state.faultModelLoaded = true;
    state.selectedNodeId = "imu";
    state.modal = null;
    syncView();
    toast("故障模型页面已打开，现在可以进行故障建模。", "success");
  }

  function saveSystemModel() {
    if (!state.modelLoaded) {
      toast("当前还没有可保存的系统模型。", "warning");
      return;
    }
    toast("系统模型布局已保存。", "success");
  }

  function saveResult() {
    if (!state.faultConfigured) {
      toast("请先完成故障建模，再保存仿真结果。", "warning");
      return;
    }
    toast("仿真结果已保存。", "success");
  }

  function startModeling() {
    if (!state.faultModelLoaded) {
      toast("请先导入故障模型，再进行故障建模。", "warning");
      return;
    }
    state.activeStage = 2;
    state.modal = "templates";
    syncView();
  }

  function toggleTemplate(templateId) {
    state.previewTemplateId = templateId;
    const index = state.selectedTemplateIds.indexOf(templateId);
    if (index > -1) state.selectedTemplateIds.splice(index, 1);
    else state.selectedTemplateIds.push(templateId);
    if (!state.selectedTemplateIds.includes(state.config.templateId) && state.selectedTemplateIds.length) {
      state.config.templateId = state.selectedTemplateIds[0];
    }
    syncView();
  }

  function confirmModeling() {
    if (!state.selectedTemplateIds.length) {
      toast("请至少选择一个故障模板。", "warning");
      return;
    }
    state.faultConfigured = true;
    state.modal = null;
    state.selectedNodeId = state.config.targetId;
    state.faultedNodeIds = [state.config.targetId];
    syncView();
    toast("故障建模已完成，可以切换到仿真分析。", "success");
  }

  function openAnalysis() {
    if (!state.faultConfigured) {
      toast("请先完成故障建模，再查看仿真分析。", "warning");
      return;
    }
    state.activeStage = 3;
    state.selectedNodeId = "scope";
    state.modal = "scope";
    syncView();
  }

  function setStage(stageId) {
    if (!render.canVisitStage(stageId, state)) {
      toast("请先完成前置步骤，再切换到该页面。", "warning");
      return;
    }
    state.activeStage = stageId;
    if (stageId !== 3) {
      state.modal = null;
    }
    syncView();
  }

  function handleClick(event) {
    if (event.target.hasAttribute("data-close-modal")) {
      state.modal = null;
      syncView();
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.getAttribute("data-action");
      if (action === "import-system") importSystemModel();
      if (action === "import-fault") importFaultModel();
      if (action === "save-system") saveSystemModel();
      if (action === "save-result") saveResult();
      if (action === "start-modeling") startModeling();
      if (action === "confirm-modeling") confirmModeling();
      if (action === "open-analysis") openAnalysis();
      if (action === "toggle-compare") {
        state.compareMode = !state.compareMode;
        syncView();
      }
      if (action === "close-modal") {
        state.modal = null;
        syncView();
      }
      return;
    }

    const stageEl = event.target.closest("[data-stage]");
    if (stageEl) {
      setStage(Number(stageEl.getAttribute("data-stage")));
      return;
    }

    const nodeEl = event.target.closest("[data-node]");
    if (nodeEl) {
      state.selectedNodeId = nodeEl.getAttribute("data-node");
      syncView();
      return;
    }

    const categoryEl = event.target.closest("[data-template-category]");
    if (categoryEl) {
      state.activeTemplateCategory = categoryEl.getAttribute("data-template-category");
      const first = (data.templates[state.activeTemplateCategory] || [])[0];
      state.previewTemplateId = first ? first.id : state.previewTemplateId;
      syncView();
      return;
    }

    const templateEl = event.target.closest("[data-template-id]");
    if (templateEl) {
      toggleTemplate(templateEl.getAttribute("data-template-id"));
    }
  }

  function handleResize() {
    if (state.modal === "scope") {
      render.drawScopeCharts(state);
    }
  }

  function init() {
    cacheRefs();
    syncView();
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.modal) {
        state.modal = null;
        syncView();
      }
    });
    window.addEventListener("resize", handleResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
