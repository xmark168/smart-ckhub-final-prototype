(function () {
  var screen = document.getElementById("contracts");
  var projects = window.CKHubProjectRecords || [];
  if (!screen || !projects.length) return;

  var state = { query: "", status: "", page: 1, pageSize: 10 };
  var records = [];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }
  function inputDate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function formatDate(date) {
    return String(date.getDate()).padStart(2, "0") + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + date.getFullYear();
  }
  function endDate(start, cycles) {
    var date = new Date(start + "T00:00:00");
    return new Date(date.getFullYear(), date.getMonth() + Number(cycles), date.getDate() - 1);
  }
  function contractStatus(row) {
    return row.status === "Hiệu lực" ? "ok" : row.status === "Nháp" ? "muted" : row.status === "Đã hủy" ? "danger" : "waiting";
  }
  function paymentLabel(row) {
    var debt = Math.max(0, row.value - row.paid);
    return debt === 0 ? "Đã thu đủ" : row.paid ? "Thu một phần" : "Chờ thu";
  }
  function paymentTone(row) {
    return row.paid >= row.value ? "ok" : row.paid ? "waiting" : "danger";
  }
  function primaryContract(project) {
    return records.find(function (row) {
      return row.projectId === project.id && row.isPrimary && row.status !== "Đã hủy";
    });
  }
  function syncProject(project) {
    var primary = primaryContract(project);
    project.contracts = records.filter(function (row) { return row.projectId === project.id; });
    project.contractCode = primary ? primary.code : "";
    project.total = primary ? primary.cycles : 0;
  }
  function seed() {
    projects.forEach(function (project, index) {
      if (project.state === "draft") return;
      var cycles = project.total || (index % 4 === 0 ? 3 : 6);
      records.push({
        id: "contract-" + (index + 1),
        code: project.contractCode || "HĐ-2026-" + String(index + 1).padStart(3, "0"),
        projectId: project.id,
        customer: project.customer,
        project: project.customer,
        type: "Hợp đồng chính",
        isPrimary: true,
        service: project.service,
        scope: project.serviceScope,
        cycles: cycles,
        start: "2026-09-01",
        end: formatDate(endDate("2026-09-01", cycles)),
        value: project.servicePrice || (index % 3 === 0 ? 9000000 : 2000000),
        paid: index % 5 === 0 ? 0 : index % 4 === 0 ? 1000000 : project.servicePrice || 2000000,
        paymentDue: "2026-09-25",
        status: index % 13 === 0 ? "Kết thúc" : "Hiệu lực",
        evidence: "",
        activity: ["Đã tạo từ dữ liệu mẫu"],
      });
      if (index % 11 === 3) {
        records.push({
          id: "appendix-" + (index + 1),
          code: "PL-2026-" + String(index + 1).padStart(3, "0"),
          projectId: project.id,
          customer: project.customer,
          project: project.customer,
          type: "Phụ lục",
          isPrimary: false,
          service: project.service,
          scope: "Bổ sung phạm vi theo phụ lục.",
          cycles: 1,
          start: "2026-09-15",
          end: "14.10.2026",
          value: 1000000,
          paid: 0,
          paymentDue: "2026-09-25",
          status: "Hiệu lực",
          evidence: "",
          activity: ["Phụ lục bổ sung phạm vi"],
        });
      }
      syncProject(project);
    });
  }
  seed();
  window.CKHubContractRecords = records;
  window.CKHubContracts = {
    createPrimary: function (project, input) {
      records.forEach(function (row) {
        if (row.projectId === project.id && row.isPrimary && row.status === "Hiệu lực") row.status = "Kết thúc";
      });
      var row = {
        id: "contract-" + Date.now(),
        code: input.code,
        projectId: project.id,
        customer: project.customer,
        project: project.customer,
        type: "Hợp đồng chính",
        isPrimary: true,
        service: project.service,
        scope: project.serviceScope,
        cycles: Number(input.cycles),
        start: input.start,
        end: formatDate(endDate(input.start, input.cycles)),
        value: Number(input.value),
        paid: 0,
        paymentDue: input.paymentDue,
        status: "Hiệu lực",
        evidence: input.evidence,
        attachmentName: input.attachmentName || "",
        activity: ["Đã tạo từ Cổng khởi động"],
      };
      records.unshift(row);
      syncProject(project);
      return row;
    },
  };

  function filtered() {
    var query = state.query;
    return records.filter(function (row) {
      return (!state.status || row.status === state.status) &&
        [row.code, row.customer, row.project, row.service, row.type].join(" ").toLocaleLowerCase("vi").includes(query);
    });
  }
  function render() {
    var list = filtered(),
      pages = Math.max(1, Math.ceil(list.length / state.pageSize)),
      effective = records.filter(function (row) { return row.status === "Hiệu lực"; }),
      debt = effective.reduce(function (sum, row) { return sum + Math.max(0, row.value - row.paid); }, 0),
      collected = effective.reduce(function (sum, row) { return sum + row.paid; }, 0),
      primary = effective.filter(function (row) { return row.isPrimary; }).length;
    if (state.page > pages) state.page = pages;
    screen.innerHTML = '<div class="contracts-page"><div class="project-page-head"><div><div class="project-title-line"><h1>Hợp đồng & công nợ</h1><button class="project-help" id="contractHelp" aria-label="Quy tắc hợp đồng">?</button></div><p>Cam kết thương mại liên kết với dự án. Công nợ tính từ số đã thu thực tế.</p></div><button class="primary" id="createContract"><i data-lucide="file-plus-2"></i> Tạo hợp đồng</button></div><section class="contract-kpis"><button data-contract-kpi=""><span>Hợp đồng hiệu lực</span><b>' + effective.length + '</b><small>' + primary + ' hợp đồng chính</small></button><button data-contract-kpi="debt"><span>Còn cần thu</span><b>' + money(debt) + '</b><small>Chỉ tính hợp đồng hiệu lực</small></button><button data-contract-kpi=""><span>Đã thu thực tế</span><b>' + money(collected) + '</b><small>Ghi nhận theo từng hợp đồng</small></button><button data-contract-kpi="appendix"><span>Phụ lục đang hiệu lực</span><b>' + effective.filter(function (row) { return row.type === "Phụ lục"; }).length + '</b><small>Không tự thay hợp đồng chính</small></button></section><section class="project-list-shell contract-list-shell"><div class="project-toolbar-new"><label class="project-search-new"><i data-lucide="search"></i><input id="contractSearch" type="search" value="' + esc(state.query) + '" placeholder="Tìm mã hợp đồng, khách hàng, dự án…"></label><select id="contractStatus"><option value="">Tất cả trạng thái</option><option>Nháp</option><option>Hiệu lực</option><option>Kết thúc</option><option>Đã hủy</option></select></div><div class="project-table-wrap"><table class="project-table-new contract-table"><thead><tr><th>Hợp đồng</th><th>Khách hàng / Dự án</th><th>Gói dịch vụ</th><th>Chu kỳ</th><th>Giá trị</th><th>Đã thu</th><th>Còn nợ</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize).map(function (row) { var debtValue = Math.max(0, row.value - row.paid); return '<tr data-contract-id="' + esc(row.id) + '"><td><b>' + esc(row.code) + '</b><span class="project-record-meta">' + esc(row.type) + (row.isPrimary ? ' · Hợp đồng chính' : '') + '</span></td><td><span class="project-record-name">' + esc(row.customer) + '</span><span class="project-record-meta">Dự án: ' + esc(row.project) + '</span></td><td><span class="contract-service">' + esc(row.service || "Chưa có gói dịch vụ") + '</span></td><td>' + row.cycles + ' chu kỳ<span class="project-record-meta">' + formatDate(new Date(row.start + "T00:00:00")) + ' – ' + row.end + '</span></td><td>' + money(row.value) + '</td><td>' + money(row.paid) + '<span class="pill ' + paymentTone(row) + '">' + paymentLabel(row) + '</span></td><td><b class="' + (debtValue ? 'contract-debt' : '') + '">' + money(debtValue) + '</b></td><td><span class="pill ' + contractStatus(row) + '">' + esc(row.status) + '</span></td><td><button class="project-open" aria-label="Mở ' + esc(row.code) + '">›</button></td></tr>'; }).join("") + (list.length ? "" : '<tr><td colspan="9">Không có hợp đồng phù hợp.</td></tr>') + '</tbody></table></div><footer class="project-footer-new"><span>Hiển thị <b>' + (list.length ? (state.page - 1) * state.pageSize + 1 + "–" + Math.min(state.page * state.pageSize, list.length) : 0) + '</b> trong <b>' + list.length + '</b> hợp đồng</span><div class="project-pager"><button id="contractPrev" ' + (state.page === 1 ? "disabled" : "") + '>‹</button><button disabled>' + state.page + ' / ' + pages + '</button><button id="contractNext" ' + (state.page === pages ? "disabled" : "") + '>›</button></div></footer></section></div>';
    bind();
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
  function bind() {
    screen.querySelector("#contractStatus").value = state.status;
    screen.querySelector("#contractSearch").addEventListener("input", function (event) { state.query = event.target.value.toLocaleLowerCase("vi"); state.page = 1; render(); screen.querySelector("#contractSearch").focus(); });
    screen.querySelector("#contractStatus").addEventListener("change", function (event) { state.status = event.target.value; state.page = 1; render(); });
    screen.querySelector("#createContract").addEventListener("click", function () { openModal(); });
    screen.querySelector("#contractPrev").addEventListener("click", function () { state.page--; render(); });
    screen.querySelector("#contractNext").addEventListener("click", function () { state.page++; render(); });
    screen.querySelector("#contractHelp").addEventListener("click", function () { showInfo("Quy tắc hợp đồng", "Một dự án có thể có nhiều hợp đồng hoặc phụ lục. Chỉ một hợp đồng chính hiệu lực quyết định tổng chu kỳ. Số chu kỳ và giá trị không nhập trực tiếp trên dự án. Còn nợ = giá trị trừ số đã thu thực tế."); });
    screen.querySelectorAll("tr[data-contract-id]").forEach(function (row) { row.addEventListener("click", function () { openDetail(records.find(function (item) { return item.id === row.dataset.contractId; })); }); });
  }
  function modalShell(title, content) {
    var modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML = '<form class="modal contract-modal"><div class="modal-top"><h2>' + title + '</h2><button class="close" type="button">×</button></div><div class="form">' + content + '</div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) { button.addEventListener("click", function () { modal.remove(); }); });
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.remove(); });
    return modal;
  }
  function openModal(row) {
    var project = projects.find(function (item) { return row && item.id === row.projectId; }) || projects[0];
    var modal = modalShell(row ? "Sửa hợp đồng" : "Tạo hợp đồng", '<label class="field">Dự án<select name="project">' + projects.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (item.id === project.id ? "selected" : "") + '>' + esc(item.customer) + ' · ' + esc(item.service) + '</option>'; }).join("") + '</select></label><label class="field">Loại liên kết<select name="type"><option ' + ((row ? row.type : "Hợp đồng chính") === "Hợp đồng chính" ? "selected" : "") + '>Hợp đồng chính</option><option ' + (row && row.type === "Phụ lục" ? "selected" : "") + '>Phụ lục</option></select></label><label class="field">Mã hợp đồng<input name="code" required value="' + esc(row ? row.code : "HĐ-2026-") + '"></label><label class="field">Số chu kỳ theo hợp đồng<input name="cycles" type="number" min="1" required value="' + esc(row ? row.cycles : 1) + '"></label><label class="field">Ngày bắt đầu hợp đồng<input name="start" type="date" required value="' + esc(row ? row.start : "2026-10-01") + '"></label><label class="field">Giá trị hợp đồng<input name="value" type="number" min="0" required value="' + esc(row ? row.value : project.servicePrice || 0) + '"></label><label class="field">Hạn thanh toán<input name="paymentDue" type="date" required value="' + esc(row ? row.paymentDue : "2026-10-05") + '"></label><label class="field">Trạng thái<select name="status"><option ' + ((row ? row.status : "Nháp") === "Nháp" ? "selected" : "") + '>Nháp</option><option ' + ((row ? row.status : "Nháp") === "Hiệu lực" ? "selected" : "") + '>Hiệu lực</option><option ' + ((row ? row.status : "Nháp") === "Kết thúc" ? "selected" : "") + '>Kết thúc</option><option ' + ((row ? row.status : "Nháp") === "Đã hủy" ? "selected" : "") + '>Đã hủy</option></select></label><label class="field">Chứng từ / link đối chiếu<input name="evidence" value="' + esc(row ? row.evidence : "") + '"></label><div class="customer-data-rules"><p>Ngày kết thúc dự kiến tự tính từ ngày bắt đầu và số chu kỳ. Chỉ một hợp đồng chính hiệu lực trên mỗi dự án.</p></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu hợp đồng</button></div>');
    modal.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target, target = projects.find(function (item) { return item.id === form.project.value; }), current = row || { id: "contract-" + Date.now(), paid: 0, activity: [] };
      current.projectId = target.id; current.customer = target.customer; current.project = target.customer; current.type = form.type.value; current.isPrimary = current.type === "Hợp đồng chính"; current.code = form.code.value.trim().toUpperCase(); current.cycles = Number(form.cycles.value); current.start = form.start.value; current.end = formatDate(endDate(current.start, current.cycles)); current.value = Number(form.value.value); current.paymentDue = form.paymentDue.value; current.status = form.status.value; current.evidence = form.evidence.value.trim(); current.service = target.service; current.scope = target.serviceScope;
      if (current.isPrimary && current.status === "Hiệu lực") records.forEach(function (item) { if (item.projectId === target.id && item.id !== current.id && item.isPrimary) item.isPrimary = false; });
      current.activity.unshift("Đã cập nhật thông tin hợp đồng");
      if (!row) records.unshift(current);
      syncProject(target);
      modal.remove(); render(); if (window.showToast) window.showToast("Đã lưu hợp đồng.");
    });
  }
  function openDetail(row) {
    var project = projects.find(function (item) { return item.id === row.projectId; }), debt = Math.max(0, row.value - row.paid), modal = modalShell(row.code, '<div class="contract-detail-meta"><div><span>Khách hàng</span><b>' + esc(row.customer) + '</b></div><div><span>Liên kết</span><b>' + esc(row.type) + (row.isPrimary ? " · Chính" : "") + '</b></div><div><span>Thời hạn</span><b>' + formatDate(new Date(row.start + "T00:00:00")) + " – " + row.end + '</b></div></div><div class="customer-data-rules"><b>' + esc(row.service || "Chưa có gói dịch vụ") + '</b><p>' + esc(row.scope || "Chưa có phạm vi dịch vụ.") + '</p></div><div class="contract-money-grid"><div><span>Giá trị</span><b>' + money(row.value) + '</b></div><div><span>Đã thu thực tế</span><b>' + money(row.paid) + '</b></div><div><span>Còn nợ</span><b class="contract-debt">' + money(debt) + '</b></div></div><label class="field">Ghi nhận thu<input name="payment" type="number" min="1" max="' + debt + '" ' + (debt ? "" : "disabled") + ' placeholder="Số tiền thực thu"></label><label class="field">Ngày thu<input name="paidAt" type="date" value="2026-09-23" ' + (debt ? "" : "disabled") + '></label><label class="field">Chứng từ / link<input name="paymentEvidence" ' + (debt ? "" : "disabled") + ' placeholder="Link chứng từ hoặc mã giao dịch"></label><div class="form-actions"><button class="secondary" type="button" id="editContract">Sửa hợp đồng</button><button class="primary" ' + (debt ? "" : "disabled") + '>Ghi nhận thu</button></div>');
    modal.querySelector("#editContract").addEventListener("click", function () { modal.remove(); openModal(row); });
    modal.querySelector("form").addEventListener("submit", function (event) { event.preventDefault(); var form = event.target, amount = Number(form.payment.value || 0); if (!amount || amount > debt) return; row.paid += amount; row.activity.unshift("Đã ghi nhận thu " + money(amount) + " ngày " + form.paidAt.value); modal.remove(); render(); if (window.showToast) window.showToast("Đã ghi nhận số tiền thực thu."); });
  }
  function showInfo(title, message) {
    var modal = modalShell(title, '<div class="customer-data-rules"><p>' + esc(message) + '</p></div><div class="form-actions"><button class="primary" type="button">Đóng</button></div>');
    modal.querySelector(".primary").addEventListener("click", function () { modal.remove(); });
  }
  render();
})();
