(function () {
  var screen = document.getElementById("projects");
  if (!screen || !window.CKHubCustomerData) return;
  var oldDetail = document.getElementById("projectDetail");
  if (oldDetail) oldDetail.remove();
  var base = window.CKHubCustomerData.concat([
    ["Ẩm Thực Phước Quắn", "Hải", "HCM"],
  ]);
  var servicePackages = (window.serviceCatalog && window.serviceCatalog.packages
    ? window.serviceCatalog.packages
    : []
  ).filter(function (item) {
    return item.status === "Đang áp dụng";
  });
  var owners = ["Tuyền", "Nguyên", "Hiền", "Minh Anh", "Hải"];
  var state = {
    query: "",
    status: "",
    owner: "",
    area: "",
    risk: false,
    kpi: "active",
    page: 1,
    pageSize: 20,
    selected: null,
  };
  var records = base.map(function (row, index) {
    var stateName =
        index === 20
          ? "stopped"
          : index % 13 === 0
            ? "draft"
            : index % 11 === 0
              ? "pending"
              : "active",
      risk = stateName === "active" && index % 6 === 0,
      cycle = (index % 6) + 1,
      total = index % 4 === 0 ? 3 : 6,
      progress = stateName === "draft" ? 0 : Math.min(92, 24 + ((index * 9) % 69)),
      due =
        stateName === "draft"
          ? ""
          : ["23.09.2026", "29.09.2026", "30.09.2026", "01.10.2026"][
              index % 4
            ],
      servicePackage = servicePackages[index % servicePackages.length];
    return {
      id: "project-" + (index + 1),
      code: "DA-2026-" + String(index + 1).padStart(3, "0"),
      customer: row[0],
      owner: owners[index % owners.length],
      createdBy: owners[(index + 2) % owners.length],
      area: row[2],
      service: servicePackage
        ? servicePackage.group + " · " + servicePackage.name
        : "Chưa có dịch vụ áp dụng",
      servicePackageId: servicePackage ? servicePackage.id : "",
      serviceScope: servicePackage ? servicePackage.scope : "",
      servicePrice: servicePackage ? servicePackage.price : 0,
      contractCode:
        stateName === "draft"
          ? ""
          : "HĐ-2026-" + String(index + 1).padStart(3, "0"),
      activities:
        stateName === "draft"
          ? [
              {
                icon: "file-plus-2",
                title: "Dự án nháp đã tạo",
                detail: "Chờ Account bắt đầu triển khai và tạo chu kỳ 1.",
              },
            ]
          : [
              {
                icon: "calendar-check-2",
                title: "Account đã rà soát tiến độ chu kỳ",
                detail: "Hôm nay · Chu kỳ " + cycle + " / " + total,
              },
              {
                icon: "package-check",
                title: "Gói dịch vụ đã áp dụng",
                detail: servicePackage
                  ? servicePackage.group + " · " + servicePackage.name
                  : "Chưa có dịch vụ áp dụng",
              },
              {
                icon: "list-checks",
                title: "Đầu ra chu kỳ đang được theo dõi",
                detail: "Bài đăng, shooting và công việc theo kế hoạch.",
              },
            ],
      state: stateName,
      risk: risk,
      cycle: stateName === "draft" ? 0 : cycle,
      total: stateName === "draft" ? 0 : total,
      progress: progress,
      due: due,
      posts: stateName === "draft" ? 0 : index % 3 === 0 ? 8 : 12,
      shooting: stateName === "draft" ? 0 : index % 4 === 0 ? 2 : 1,
      tasks: stateName === "draft" ? 0 : risk ? 3 : (index % 4) + 1,
    };
  });
  var onboardingPackage = servicePackages[0] || {};
  records.unshift({
    id: "project-onboarding-01",
    code: "DA-2026-056",
    customer: "Cơm Tấm Tài",
    owner: "Hiền",
    createdBy: "Hiền",
    area: "HCM",
    service: onboardingPackage.id
      ? onboardingPackage.group + " · " + onboardingPackage.name
      : "Chưa có dịch vụ áp dụng",
    servicePackageId: onboardingPackage.id || "",
    serviceScope: onboardingPackage.scope || "",
    servicePrice: onboardingPackage.price || 0,
    contractCode: "",
    state: "draft",
    risk: false,
    cycle: 0,
    total: 0,
    progress: 0,
    cycleStart: "",
    due: "",
    posts: 0,
    shooting: 0,
    tasks: 0,
    activities: [{
      icon: "file-plus-2",
      title: "Dự án nháp đã tạo",
      detail: "Chờ hoàn tất Cổng khởi động trước khi tạo chu kỳ 1.",
    }],
  });
  window.CKHubProjectRecords = records;
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }
  function formatDate(date) {
    return (
      String(date.getDate()).padStart(2, "0") +
      "." +
      String(date.getMonth() + 1).padStart(2, "0") +
      "." +
      date.getFullYear()
    );
  }
  function cycleEndDate(startValue) {
    var start = new Date(startValue + "T00:00:00");
    return new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate() - 1,
    );
  }
  function cycleEnd(startValue) {
    return formatDate(cycleEndDate(startValue));
  }
  function inputDate(date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }
  function plannedEndInput(item) {
    if (!item.due) return "";
    var parts = item.due.split(".");
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  function cycleRange(item) {
    var start;
    if (item.cycleStart) {
      start = new Date(item.cycleStart + "T00:00:00");
      return formatDate(start) + " – " + cycleEnd(item.cycleStart);
    }
    if (!item.due) return "Chưa bắt đầu";
    var parts = item.due.split("."),
      end = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate() + 1);
    return formatDate(start) + " – " + item.due;
  }
  function navigate(id) {
    if (typeof window.showScreen === "function") window.showScreen(id);
    else
      document.querySelectorAll(".screen").forEach(function (item) {
        item.classList.toggle("active", item.id === id);
      });
  }
  function label(item) {
    return item.state === "active"
      ? "Đang triển khai"
      : item.state === "pending"
        ? "Tạm dừng"
        : item.state === "stopped"
          ? "Đã dừng"
          : "Dự án nháp";
  }
  function kind(item) {
    return item.risk
      ? "danger"
      : item.state === "active"
        ? "ok"
        : item.state === "draft"
          ? "muted"
          : "waiting";
  }
  function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }
  function addActivity(item, icon, title, detail) {
    item.activities = item.activities || [];
    item.activities.unshift({ icon: icon, title: title, detail: detail });
    item.activities = item.activities.slice(0, 8);
  }
  function projectActivityRows(item) {
    var activity = item.activities || [];
    if (!activity.length)
      return '<p class="project-empty-log">Chưa có hoạt động được ghi nhận.</p>';
    return activity
      .map(function (entry) {
        return (
          '<div class="project-status-row"><i data-lucide="' +
          esc(entry.icon || "history") +
          '"></i><span><b>' +
          esc(entry.title) +
          "</b><small>" +
          esc(entry.detail) +
          "</small></span></div>"
        );
      })
      .join("");
  }
  function onboardingItems(item) {
    var data = item.onboarding || {};
    return [
      {
        key: "contract",
        icon: "file-text",
        title: "Hợp đồng chính",
        ready: Boolean(item.contractCode),
        detail: item.contractCode
          ? "Đã liên kết " + item.contractCode
          : "Cần hợp đồng chính hiệu lực.",
      },
      {
        key: "finance",
        icon: "badge-check",
        title: "Xác nhận tài chính",
        ready: Boolean(data.financeVerified),
        detail: data.financeVerified
          ? "Kế toán đã xác nhận: " + (data.financeRef || "Đã xác nhận")
          : "Chờ Kế toán xác nhận cọc hoặc thanh toán.",
      },
      {
        key: "handover",
        icon: "handshake",
        title: "Bàn giao từ Sale",
        ready: Boolean(data.handoverReady),
        detail: data.handoverReady
          ? "Đã có Sales Brief."
          : "Cần Sales Brief và phạm vi đã chốt.",
      },
      {
        key: "brief",
        icon: "clipboard-check",
        title: "Brief và tài liệu",
        ready: Boolean(data.briefReady),
        detail: data.briefReady
          ? "Brief, tài liệu nguồn đã đủ."
          : "Cần brief và tài liệu vận hành.",
      },
      {
        key: "setup",
        icon: "settings-2",
        title: "Thiết lập triển khai",
        ready: Boolean(data.setupReady),
        detail: data.setupReady
          ? "Đã chuẩn bị workspace và quyền truy cập cần thiết."
          : "Thiết lập theo gói dịch vụ chưa hoàn tất.",
      },
    ];
  }
  function onboardingReady(item) {
    return onboardingItems(item).every(function (entry) {
      return entry.ready;
    });
  }
  function onboardingPanel(item) {
    if (item.state !== "draft") return "";
    var items = onboardingItems(item), completed = items.filter(function (entry) { return entry.ready; }).length;
    return '<section class="panel onboarding-panel"><div class="panel-head"><div><h2>Cổng khởi động</h2><p class="subline">Hoàn tất điều kiện trước khi tạo chu kỳ 1.</p></div><span class="onboarding-count ' + (completed === items.length ? "ready" : "") + '">' + completed + ' / ' + items.length + '</span></div><div class="onboarding-list">' + items.map(function (entry) { return '<div class="onboarding-row ' + (entry.ready ? "complete" : "") + '"><i data-lucide="' + entry.icon + '"></i><span><b>' + entry.title + '</b><small>' + entry.detail + '</small></span><em data-lucide="' + (entry.ready ? "check" : "clock-3") + '"></em></div>'; }).join("") + '</div><div class="onboarding-actions"><small>' + (completed === items.length ? "Đủ điều kiện. Account có thể khởi động dự án." : "Còn " + (items.length - completed) + " điều kiện cần xử lý.") + '</small><button class="secondary" id="editOnboarding"><i data-lucide="list-checks"></i> Cập nhật Onboarding</button></div></section>';
  }
  function addBusinessDays(startValue, days) {
    var date = new Date(startValue + "T00:00:00"), added = 0;
    while (added < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) added++;
    }
    return formatDate(date);
  }
  function filtered() {
    return records.filter(function (item) {
      var text = [item.code, item.customer, item.owner, item.area, item.service]
        .join(" ")
        .toLocaleLowerCase("vi");
      return (
        text.includes(state.query) &&
        (!state.status || item.state === state.status) &&
        (!state.owner || item.owner === state.owner) &&
        (!state.area || item.area === state.area) &&
        (!state.risk || item.risk) &&
        (state.kpi === "active"
          ? item.state === "active"
          : state.kpi === "risk"
            ? item.risk
            : state.kpi === "paused"
              ? item.state === "pending" || item.state === "stopped"
              : state.kpi === "draft"
                ? item.state === "draft"
              : true)
      );
    });
  }
  function render() {
    var active = records.filter(function (item) {
        return item.state === "active";
      }),
      risk = active.filter(function (item) {
        return item.risk;
      }),
      paused = records.filter(function (item) {
        return item.state === "pending" || item.state === "stopped";
      }),
      drafts = records.filter(function (item) {
        return item.state === "draft";
      }),
      list = filtered(),
      pages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > pages) state.page = pages;
    screen.innerHTML =
      '<div class="projects-page"><div class="project-page-head"><h1>Dự án <button class="customer-help" id="projectHelp" aria-label="Quy tắc dự án">?</button></h1><button class="primary" id="createProject"><i data-lucide="plus"></i> Tạo dự án</button></div><section class="project-dashboard"><button class="project-kpi hero ' +
      (state.kpi === "active" ? "selected" : "") +
      '" data-kpi="active"><label>Đang triển khai</label><strong>' +
      active.length +
      "</strong><small>" +
      risk.length +
      ' dự án cần theo dõi</small></button><button class="project-kpi risk ' +
      (state.kpi === "risk" ? "selected" : "") +
      '" data-kpi="risk"><label>Có rủi ro</label><strong>' +
      risk.length +
      '</strong><small>Trễ hoặc có nguy cơ trễ chu kỳ</small></button><button class="project-kpi ' +
      (state.kpi === "paused" ? "selected" : "") +
      '" data-kpi="paused"><label>Tạm dừng / đã dừng</label><strong>' +
      paused.length +
      '</strong><small>Không tự đổi tiến độ hợp đồng</small></button><button class="project-kpi ' +
      (state.kpi === "draft" ? "selected" : "") +
      '" data-kpi="draft"><label>Dự án nháp</label><strong>' +
      drafts.length +
      '</strong><small>Cần hoàn tất Cổng khởi động</small></button></section><section class="project-list-shell"><div class="project-toolbar-new"><label class="project-search-new"><i data-lucide="search"></i><input id="projectSearchNew" type="search" value="' +
      esc(state.query) +
      '" placeholder="Tìm mã dự án, khách hàng, Account…"></label><div class="project-filter-control"><button class="project-filter-trigger" id="projectFilterToggle" title="Lọc dự án"><i data-lucide="list-filter"></i>' +
      ([state.status, state.owner, state.area, state.risk].filter(Boolean)
        .length
        ? "<span>" +
          [state.status, state.owner, state.area, state.risk].filter(Boolean)
            .length +
          "</span>"
        : "") +
      '</button><div class="project-filter-popover" id="projectFilterPopover"><div class="project-filter-popover-head"><b>Lọc dự án</b><button id="projectResetFilters">Xóa lọc</button></div><label>Trạng thái<select id="projectStatus"><option value="">Tất cả</option><option value="active">Đang triển khai</option><option value="pending">Tạm dừng</option><option value="stopped">Đã dừng</option><option value="draft">Dự án nháp</option></select></label><label>Account<select id="projectOwner"><option value="">Tất cả Account</option>' +
      owners
        .map(function (owner) {
          return '<option value="' + owner + '">' + owner + "</option>";
        })
        .join("") +
      '</select></label><label>Khu vực<select id="projectArea"><option value="">Tất cả khu vực</option>' +
      Array.from(
        new Set(
          records.map(function (item) {
            return item.area;
          }),
        ),
      )
        .map(function (area) {
          return '<option value="' + area + '">' + area + "</option>";
        })
        .join("") +
      '</select></label><label class="filter-check"><input id="projectRisk" type="checkbox"> Chỉ dự án có rủi ro</label></div></div></div><div class="project-table-wrap"><table class="project-table-new"><thead><tr><th>Dự án</th><th>Account</th><th>Chu kỳ</th><th>Chu kỳ hiện tại</th><th>Tiến độ</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
      list
        .slice((state.page - 1) * state.pageSize, state.page * state.pageSize)
        .map(function (item) {
          return (
            '<tr data-id="' +
            item.id +
            '"><td><span class="project-record-name">' +
            esc(item.customer) +
            '</span><span class="project-record-meta">' +
            item.code +
            " · " +
            esc(item.service) +
            "</span></td><td>" +
            esc(item.owner) +
            "</td><td>" +
            item.cycle +
            " / " +
            item.total +
            "</td><td>" +
            cycleRange(item) +
            '</td><td><div class="project-progress"><i style="--progress:' +
            item.progress +
            '%"></i><span>' +
            item.progress +
            '%</span></div></td><td><span class="pill ' +
            kind(item) +
            '">' +
            label(item) +
            '</span></td><td><button class="project-open" aria-label="Mở ' +
            esc(item.customer) +
            '">›</button></td></tr>'
          );
        })
        .join("") +
      (list.length
        ? ""
        : '<tr><td colspan="7">Không tìm thấy dự án phù hợp.</td></tr>') +
      '</tbody></table></div><footer class="project-footer-new"><span>Hiển thị <b>' +
      (list.length
        ? (state.page - 1) * state.pageSize +
          1 +
          "–" +
          Math.min(state.page * state.pageSize, list.length)
        : 0) +
      "</b> trong <b>" +
      list.length +
      '</b> dự án</span><div class="project-pager"><button id="projectPrev" ' +
      (state.page === 1 ? "disabled" : "") +
      ">‹</button><button disabled>" +
      state.page +
      " / " +
      pages +
      '</button><button id="projectNext" ' +
      (state.page === pages ? "disabled" : "") +
      ">›</button></div></footer></section></div>";
    bind();
    icons();
  }
  function icons() {
    if (window.lucide)
      window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
  function bind() {
    var filter = screen.querySelector(".project-filter-control");
    screen.querySelector("#projectStatus").value = state.status;
    screen.querySelector("#projectOwner").value = state.owner;
    screen.querySelector("#projectArea").value = state.area;
    screen.querySelector("#projectRisk").checked = state.risk;
    screen
      .querySelector("#projectSearchNew")
      .addEventListener("input", function (event) {
        state.query = event.target.value.toLocaleLowerCase("vi");
        state.page = 1;
        render();
        var input = screen.querySelector("#projectSearchNew");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      });
    screen
      .querySelector("#projectFilterToggle")
      .addEventListener("click", function () {
        filter.classList.toggle("open");
      });
    ["projectStatus", "projectOwner", "projectArea", "projectRisk"].forEach(
      function (id) {
        screen.querySelector("#" + id).addEventListener("change", function () {
          state.status = screen.querySelector("#projectStatus").value;
          state.owner = screen.querySelector("#projectOwner").value;
          state.area = screen.querySelector("#projectArea").value;
          state.risk = screen.querySelector("#projectRisk").checked;
          state.page = 1;
          render();
        });
      },
    );
    screen
      .querySelector("#projectResetFilters")
      .addEventListener("click", function () {
        state.status = "";
        state.owner = "";
        state.area = "";
        state.risk = false;
        state.page = 1;
        render();
      });
    screen.querySelectorAll("[data-kpi]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.kpi = card.dataset.kpi;
        state.page = 1;
        render();
      });
    });
    screen.querySelector("#projectPrev").addEventListener("click", function () {
      state.page--;
      render();
    });
    screen.querySelector("#projectNext").addEventListener("click", function () {
      state.page++;
      render();
    });
    screen.querySelectorAll("tr[data-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        state.selected = records.find(function (item) {
          return item.id === row.dataset.id;
        });
        renderDetail();
      });
    });
    screen.querySelector("#projectHelp").addEventListener("click", function () {
      showInfo(
        "Quy tắc dự án",
        "Mỗi dự án thuộc một khách hàng và một Account phụ trách. Dự án nháp chưa có chu kỳ. Khi Account bắt đầu triển khai, hệ thống tạo chu kỳ 1 từ ngày bắt đầu và tự tính hạn một tháng. Ngày kết thúc thực tế chỉ ghi khi chốt chu kỳ. Dự án tạm dừng hoặc dừng không tự thay đổi số chu kỳ đã triển khai. Task thiếu Owner hoặc deadline không được bắt đầu.",
      );
    });
    screen
      .querySelector("#createProject")
      .addEventListener("click", function () {
        showInfo(
          "Tạo dự án",
          "Tạo dự án cần chọn khách hàng, Account và gói dịch vụ. Ngày bắt đầu chỉ được nhập khi Account bắt đầu triển khai dự án.",
        );
      });
  }
  function renderDetail() {
    var item = state.selected;
    if (!item) return;
    var onboarding = onboardingPanel(item);
    var old = document.getElementById("projectWorkspaceDetail");
    if (old) old.remove();
    var detail = document.createElement("section");
    detail.id = "projectWorkspaceDetail";
    detail.className = "screen";
    detail.innerHTML =
      '<div class="project-detail-head"><button class="project-detail-back" id="backProjects"><i data-lucide="arrow-left"></i> Dự án</button><div class="project-detail-title"><div><h1>' +
      esc(item.customer) +
      ' <span class="pill ' +
      kind(item) +
      '">' +
      label(item) +
      "</span></h1><p>" +
      item.code +
      " · " +
      esc(item.service) +
      " · Account " +
      esc(item.owner) +
      '</p></div><div class="project-detail-actions"><button class="secondary" id="editProjectDetail"><i data-lucide="pencil"></i> Sửa dự án</button><button class="primary" id="openCycleWorkspace"><i data-lucide="' +
      (item.state === "draft" ? "play" : "calendar-range") +
      '"></i> ' +
      (item.state === "draft" ? "Bắt đầu triển khai" : "Mở chu kỳ") +
      '</button></div></div></div><section class="project-overview"><div class="project-overview-main"><span>Sức khỏe triển khai</span><strong>' +
      (item.state === "draft"
        ? "Chưa bắt đầu"
        : item.risk
          ? "Cần theo dõi"
          : "Đúng tiến độ") +
      "</strong><p>" +
      (item.state === "draft"
        ? "Bắt đầu triển khai để tạo chu kỳ đầu tiên."
        : item.risk
        ? "Có " +
          item.tasks +
          " công việc cần Account rà soát trước khi kết thúc chu kỳ."
        : "Không có rủi ro đang mở trong chu kỳ này.") +
      '</p></div><div class="project-overview-stat"><span>Tiến độ hợp đồng</span><strong>' +
      (item.cycle || "–") +
      " / " +
      (item.total || "–") +
      '</strong><small>chu kỳ đã triển khai</small></div><div class="project-overview-stat"><span>Chu kỳ hiện tại</span><strong>' +
      cycleRange(item) +
      '</strong><small>' +
      (item.state === "draft"
        ? "sẽ tạo khi bắt đầu triển khai"
        : "mốc dự kiến, tính từ ngày bắt đầu") +
      '</small></div><div class="project-overview-stat"><span>Kết thúc thực tế</span><strong>' +
      (item.actualEnd || (item.state === "draft" ? "Chưa bắt đầu" : "Chưa ghi nhận")) +
      "</strong><small>" +
      (item.actualEnd
        ? "mốc hoàn thành thực tế"
        : item.state === "draft"
          ? "ghi nhận sau khi triển khai"
          : "ghi nhận khi chốt chu kỳ") +
      '</small></div></section><div class="project-detail-grid"><main>' + onboarding + '<section class="panel"><div class="panel-head"><div><h2>Đầu ra chu kỳ</h2><p class="subline">Theo dõi phạm vi đã cam kết trong tháng.</p></div><span class="pill ' +
      kind(item) +
      '">' +
      label(item) +
      '</span></div><div class="project-delivery-grid"><div><span>Bài đăng</span><b>' +
      item.posts +
      "</b><small>kế hoạch trong kỳ</small></div><div><span>Shooting</span><b>" +
      String(item.shooting).padStart(2, "0") +
      "</b><small>lịch trong kỳ</small></div><div><span>Công việc mở</span><b>" +
      String(item.tasks).padStart(2, "0") +
      "</b><small>" +
      (item.risk ? "cần xử lý" : "đang theo dõi") +
      '</small></div></div></section><section class="panel project-service-panel"><div class="panel-head"><div><h2>Dịch vụ áp dụng</h2><p class="subline">Snapshot tại thời điểm gán vào dự án.</p></div></div><div class="project-service-grid"><div><span>Gói dịch vụ</span><b>' +
      esc(item.service) +
      '</b><small>' +
      esc(item.serviceScope || "Chưa có phạm vi dịch vụ.") +
      '</small></div><div><span>Đơn giá</span><b>' +
      (item.servicePackageId ? money(item.servicePrice) : "Chưa xác định") +
      '</b><small>Chưa VAT · không tự đổi theo danh mục</small></div><div><span>Hợp đồng</span><b>' +
      esc(item.contractCode || "Chưa liên kết") +
      '</b><small>' +
      (item.contractCode
        ? item.total + " chu kỳ theo hợp đồng"
        : "Cần liên kết trước khi triển khai") +
      '</small></div></div></section><section class="panel"><div class="panel-head"><div><h2>Nhật ký dự án</h2><p class="subline">Các thay đổi quan trọng được lưu trên dự án.</p></div></div>' +
      projectActivityRows(item) +
      '</section></main><aside><section class="panel"><div class="panel-head"><h2>Account phụ trách</h2></div><button class="customer-account-card"><i>' +
      esc(item.owner).slice(0, 2).toUpperCase() +
      "</i><span><b>" +
      esc(item.owner) +
      '</b><small>Điều phối timeline và nguồn lực</small></span><em data-lucide="chevron-right"></em></button></section><section class="panel"><div class="panel-head"><h2>Kiểm soát dự án</h2></div>' +
      (item.state === "draft"
        ? ""
        : '<button class="customer-control ' +
      (item.risk ? "is-attention" : "") +
      '" id="toggleRisk"><i data-lucide="flag"></i><span><b>' +
      (item.risk ? "Đang gắn cờ cần chú ý" : "Đánh dấu cần chú ý") +
      "</b><small>" +
      (item.risk
        ? "Account cần xử lý trong chu kỳ này"
        : "Tạo điểm theo dõi cho Account") +
      '</small></span></button>') +
      (item.state === "draft"
        ? ""
        : '<button class="customer-control" id="recordActualEnd"><i data-lucide="calendar-check-2"></i><span><b>' +
      (item.actualEnd ? "Sửa kết thúc thực tế" : "Ghi nhận kết thúc thực tế") +
      '</b><small>Không thay đổi ngày kết thúc dự kiến</small></span></button>') +
      '<button class="customer-control" id="toggleProjectState"><i data-lucide="circle-pause"></i><span><b>' +
      (item.state === "active"
        ? "Dừng dự án"
        : item.state === "draft"
          ? "Bắt đầu triển khai"
          : item.state === "pending"
            ? "Tiếp tục triển khai"
            : "Mở lại dự án") +
      "</b><small>" +
      (item.state === "active"
        ? "Yêu cầu lý do và xác nhận"
        : item.state === "draft"
          ? "Chọn ngày bắt đầu chu kỳ 1"
          : "Giữ nguyên tiến độ hợp đồng") +
      "</small></span></button></section></aside></div>";
    screen.insertAdjacentElement("afterend", detail);
    detail
      .querySelector("#backProjects")
      .addEventListener("click", function () {
        navigate("projects");
      });
    detail
      .querySelector("#editProjectDetail")
      .addEventListener("click", function () {
        openProjectEdit(item);
      });
    detail
      .querySelector("#openCycleWorkspace")
      .addEventListener("click", function () {
        if (item.state === "draft") openProjectStart(item);
        else renderCycleWorkspace(item);
      });
    var onboardingControl = detail.querySelector("#editOnboarding");
    if (onboardingControl)
      onboardingControl.addEventListener("click", function () {
        openOnboarding(item);
      });
    var riskControl = detail.querySelector("#toggleRisk");
    if (riskControl)
      riskControl.addEventListener("click", function () {
        item.risk = !item.risk;
        addActivity(
          item,
          "flag",
          item.risk ? "Đã gắn cờ cần chú ý" : "Đã gỡ cờ cần chú ý",
          item.risk
            ? "Account cần kiểm soát tiến độ trong chu kỳ hiện tại."
            : "Không còn điểm rủi ro đang mở.",
        );
        renderDetail();
      });
    var actualEndControl = detail.querySelector("#recordActualEnd");
    if (actualEndControl)
      actualEndControl.addEventListener("click", function () {
        openActualEnd(item);
      });
    detail
      .querySelector("#toggleProjectState")
      .addEventListener("click", function () {
        if (item.state === "draft") openProjectStart(item);
        else {
          item.state = item.state === "active" ? "pending" : "active";
          renderDetail();
        }
      });
    icons();
    navigate("projectWorkspaceDetail");
  }
  function ensureCycleData(item) {
    if (item.cycleData) return item.cycleData;
    var seed = Number(String(item.id).replace(/\D/g, "")) || 1,
      planStatus =
        item.state === "draft"
          ? "draft"
          : seed % 5 === 0
            ? "sent"
            : seed % 7 === 0
              ? "changes"
              : "approved";
    item.cycleData = {
      plan: {
        status: planStatus,
        version: 1,
        link: "",
        sentAt: planStatus === "draft" ? "" : "22.09.2026",
        approvedAt: planStatus === "approved" ? "23.09.2026" : "",
        feedback:
          planStatus === "changes"
            ? "Cần điều chỉnh ưu tiên nội dung tuần đầu."
            : "",
      },
      tasks: [
        {
          id: "plan",
          name: "Hoàn thiện Content Plan",
          owner: item.owner,
          deadline: "23.09.2026",
          status: planStatus === "approved" ? "Đã hoàn thành" : "Việc cần làm",
          type: "Plan",
        },
        {
          id: "scripts",
          name: "Chuẩn bị 6 script đợt 1",
          owner: "Planner/Content",
          deadline: "27.09.2026",
          status: planStatus === "approved" ? "Đang thực hiện" : "Nháp",
          type: "Nội dung",
        },
        {
          id: "media",
          name: "Bàn giao script và tư liệu cho Media",
          owner: "Planner/Content",
          deadline: "29.09.2026",
          status: "Nháp",
          type: "Sản xuất",
        },
      ],
      shootings: [],
      demo: { status: "Chưa gửi", link: "", sentAt: "", approvedAt: "" },
      posts: { planned: item.posts || 12, actual: 0 },
      exceptions: [],
      activity: [
        {
          title: "Chu kỳ được tạo",
          detail: "Mốc dự kiến " + item.due,
          time: "Hôm nay",
        },
      ],
      projectId: item.id,
    };
    return item.cycleData;
  }
  function planLabel(status) {
    return (
      {
        draft: "Nháp",
        sent: "Đã gửi khách",
        changes: "Cần chỉnh sửa",
        approved: "Đã duyệt",
      }[status] || "Nháp"
    );
  }
  function statusTone(status) {
    if (
      status === "Đã duyệt" ||
      status === "Đã hoàn thành" ||
      status === "Đã xác nhận"
    )
      return "ok";
    if (
      status === "Cần chỉnh sửa" ||
      status === "Có nguy cơ trễ" ||
      status === "Trễ chu kỳ"
    )
      return "danger";
    if (
      status === "Đang thực hiện" ||
      status === "Đã gửi khách" ||
      status === "Đã gửi"
    )
      return "info";
    return "muted";
  }
  function cycleActivity(cycle, title, detail) {
    cycle.activity.unshift({ title: title, detail: detail, time: "Vừa xong" });
    var item = records.find(function (entry) {
      return entry.id === cycle.projectId;
    });
    if (item) addActivity(item, "list-checks", title, detail);
  }
  function renderCycleWorkspace(item) {
    var cycle = ensureCycleData(item),
      old = document.getElementById("cycleWorkspace"),
      completed = cycle.tasks.filter(function (task) {
        return task.status === "Đã hoàn thành";
      }).length,
      needsAttention =
        cycle.exceptions.length ||
        cycle.tasks.some(function (task) {
          return task.status !== "Nháp" && (!task.owner || !task.deadline);
        }),
      shootingLocked = cycle.plan.status !== "approved";
    if (old) old.remove();
    var workspace = document.createElement("section");
    workspace.id = "cycleWorkspace";
    workspace.className = "screen";
    workspace.innerHTML =
      '<div class="cycle-head"><div><button class="project-detail-back" id="backToProject"><i data-lucide="arrow-left"></i> Dự án</button><h1>Chu kỳ ' +
      item.cycle +
      " / " +
      item.total +
      "</h1><p>" +
      esc(item.customer) +
      " · " +
      cycleRange(item) +
      '</p></div><button class="secondary" id="openCycleException"><i data-lucide="flag"></i> Ghi nhận ngoại lệ</button></div><section class="cycle-rail"><div><span>Bắt đầu</span><b>' +
      cycleRange(item).split(" – ")[0] +
      "</b></div><i></i><div><span>Kết thúc dự kiến</span><b>" +
      item.due +
      "</b></div><i></i><div><span>Kết thúc thực tế</span><b>" +
      (item.actualEnd || "Chưa ghi nhận") +
      '</b></div><div class="cycle-health ' +
      (needsAttention ? "attention" : "") +
      '"><span>Sức khỏe</span><b>' +
      (needsAttention ? "Cần theo dõi" : "Đúng tiến độ") +
      '</b></div></section><div class="cycle-layout"><main><section class="panel cycle-panel"><div class="panel-head"><div><h2>Content Plan</h2><p class="subline">Hạn gửi khách: T0 + 3 ngày làm việc.</p></div><span class="cycle-status ' +
      statusTone(planLabel(cycle.plan.status)) +
      '">' +
      planLabel(cycle.plan.status) +
      '</span></div><dl class="cycle-definition"><div><dt>Phiên bản</dt><dd>v' +
      cycle.plan.version +
      "</dd></div><div><dt>Đã gửi</dt><dd>" +
      (cycle.plan.sentAt || "Chưa gửi") +
      "</dd></div><div><dt>Đã duyệt</dt><dd>" +
      (cycle.plan.approvedAt || "Chưa duyệt") +
      "</dd></div></dl>" +
      (cycle.plan.feedback
        ? '<p class="cycle-note">' + esc(cycle.plan.feedback) + "</p>"
        : "") +
      '<button class="text-btn" id="openPlanModal">Cập nhật Content Plan</button></section><section class="panel cycle-panel"><div class="panel-head"><div><h2>Công việc chu kỳ</h2><p class="subline">Owner và deadline là điều kiện để bắt đầu.</p></div><button class="text-btn" id="addCycleTask">+ Công việc</button></div><div class="cycle-task-list">' +
      cycle.tasks
        .map(function (task) {
          return (
            '<button class="cycle-task" data-task-id="' +
            esc(task.id) +
            '"><span><b>' +
            esc(task.name) +
            "</b><small>" +
            esc(task.owner || "Chưa giao") +
            " · " +
            esc(task.deadline || "Chưa có hạn") +
            '</small></span><em class="cycle-status ' +
            statusTone(task.status) +
            '">' +
            esc(task.status) +
            "</em></button>"
          );
        })
        .join("") +
      '</div><div class="cycle-foot">Hoàn thành <b>' +
      completed +
      " / " +
      cycle.tasks.length +
      '</b> công việc</div></section><section class="panel cycle-panel"><div class="panel-head"><div><h2>Nhật ký chu kỳ</h2><p class="subline">Dấu vết thay đổi mốc và đầu ra.</p></div></div><div class="cycle-log">' +
      cycle.activity
        .slice(0, 5)
        .map(function (log) {
          return (
            '<div><i data-lucide="clock-3"></i><span><b>' +
            esc(log.title) +
            "</b><small>" +
            esc(log.detail) +
            " · " +
            esc(log.time) +
            "</small></span></div>"
          );
        })
        .join("") +
      '</div></section></main><aside><section class="panel cycle-panel"><div class="panel-head"><div><h2>Shooting Plan</h2><p class="subline">Chỉ tạo sau khi khách duyệt Plan.</p></div><span class="cycle-status ' +
      (shootingLocked ? "muted" : "info") +
      '">' +
      (shootingLocked ? "Đang khóa" : cycle.shootings.length + " lịch") +
      '</span></div><div class="cycle-compact-list">' +
      (cycle.shootings.length
        ? cycle.shootings
            .map(function (shooting) {
              return (
                "<div><b>" +
                esc(shooting.date) +
                "</b><small>" +
                esc(shooting.media) +
                " · " +
                esc(shooting.status) +
                "</small></div>"
              );
            })
            .join("")
        : '<p class="empty-copy">Chưa có lịch shooting trong chu kỳ.</p>') +
      '</div><button class="text-btn" id="openShootingModal" ' +
      (shootingLocked ? "disabled" : "") +
      '>Tạo lịch shooting</button></section><section class="panel cycle-panel"><div class="panel-head"><div><h2>Post Demo</h2><p class="subline">Gửi khách sau shoot 1 ngày làm việc.</p></div><span class="cycle-status ' +
      statusTone(cycle.demo.status) +
      '">' +
      esc(cycle.demo.status) +
      '</span></div><p class="cycle-meta">Đã gửi: ' +
      (cycle.demo.sentAt || "Chưa gửi") +
      " · Đã duyệt: " +
      (cycle.demo.approvedAt || "Chưa duyệt") +
      '</p><button class="text-btn" id="openDemoModal">Cập nhật Post Demo</button></section><section class="panel cycle-panel"><div class="panel-head"><div><h2>Bài đăng</h2><p class="subline">Phân phối mục tiêu 2–3 bài mỗi tuần.</p></div></div><div class="cycle-post-progress"><b>' +
      cycle.posts.actual +
      " / " +
      cycle.posts.planned +
      '</b><span>đã xuất bản</span></div><button class="text-btn" id="openPostsModal">Cập nhật bài đăng</button></section><section class="panel cycle-panel"><div class="panel-head"><h2>Ngoại lệ</h2></div><div class="cycle-compact-list">' +
      (cycle.exceptions.length
        ? cycle.exceptions
            .map(function (exception) {
              return (
                "<div><b>" +
                esc(exception.type) +
                "</b><small>" +
                esc(exception.reason) +
                "</small></div>"
              );
            })
            .join("")
        : '<p class="empty-copy">Không có ngoại lệ đang mở.</p>') +
      "</div></section></aside></div>";
    screen.insertAdjacentElement("afterend", workspace);
    workspace
      .querySelector("#backToProject")
      .addEventListener("click", function () {
        workspace.remove();
        renderDetail();
      });
    workspace
      .querySelector("#openPlanModal")
      .addEventListener("click", function () {
        openPlanModal(item);
      });
    workspace
      .querySelector("#addCycleTask")
      .addEventListener("click", function () {
        openCycleTaskModal(item);
      });
    workspace.querySelectorAll("[data-task-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        openCycleTaskModal(
          item,
          cycle.tasks.find(function (task) {
            return task.id === button.dataset.taskId;
          }),
        );
      });
    });
    workspace
      .querySelector("#openShootingModal")
      .addEventListener("click", function () {
        openShootingModal(item);
      });
    workspace
      .querySelector("#openDemoModal")
      .addEventListener("click", function () {
        openDemoModal(item);
      });
    workspace
      .querySelector("#openPostsModal")
      .addEventListener("click", function () {
        openPostsModal(item);
      });
    workspace
      .querySelector("#openCycleException")
      .addEventListener("click", function () {
        openExceptionModal(item);
      });
    icons();
    navigate("cycleWorkspace");
  }
  function bindCycleModal(modal) {
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.remove();
    });
  }
  function openPlanModal(item) {
    var cycle = ensureCycleData(item),
      modal = document.createElement("div"),
      plan = cycle.plan;
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Content Plan</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Trạng thái<select name="status"><option value="draft">Nháp</option><option value="sent">Đã gửi khách</option><option value="changes">Cần chỉnh sửa</option><option value="approved">Đã duyệt</option></select></label><label class="field">Link tài liệu<input name="link" type="url" value="' +
      esc(plan.link) +
      '" placeholder="https://..."></label><label class="field">Feedback khách<textarea name="feedback" placeholder="Ghi phản hồi hoặc phạm vi cần chỉnh">' +
      esc(plan.feedback) +
      '</textarea></label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu Content Plan</button></div></div></form>';
    bindCycleModal(modal);
    var form = modal.querySelector("form");
    form.status.value = plan.status;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      plan.status = form.status.value;
      plan.link = form.link.value.trim();
      plan.feedback = form.feedback.value.trim();
      if (plan.status === "sent" && !plan.sentAt) plan.sentAt = "Hôm nay";
      if (plan.status === "approved") plan.approvedAt = "Hôm nay";
      cycleActivity(cycle, "Content Plan đã cập nhật", planLabel(plan.status));
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openCycleTaskModal(item, task) {
    var cycle = ensureCycleData(item),
      editing = !!task,
      modal = document.createElement("div");
    task = task || {
      id: "task-" + Date.now(),
      name: "",
      owner: "",
      deadline: "",
      status: "Nháp",
      type: "Nội dung",
    };
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>' +
      (editing ? "Cập nhật công việc" : "Tạo công việc") +
      '</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Công việc<input name="name" required value="' +
      esc(task.name) +
      '"></label><label class="field">Owner<select name="owner"><option value="">Chưa giao</option>' +
      owners
        .concat(["Planner/Content", "Media"])
        .map(function (owner) {
          return (
            '<option value="' + esc(owner) + '">' + esc(owner) + "</option>"
          );
        })
        .join("") +
      '</select></label><label class="field">Deadline<input name="deadline" type="date" value="' +
      (task.deadline ? plannedEndInput({ due: task.deadline }) : "") +
      '"></label><label class="field">Trạng thái<select name="status"><option>Nháp</option><option>Việc cần làm</option><option>Đang thực hiện</option><option>Đang chờ</option><option>Đã hoàn thành</option></select></label><div class="customer-data-rules"><p>Công việc thiếu Owner hoặc deadline chỉ được lưu ở trạng thái Nháp.</p></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu công việc</button></div></div></form>';
    bindCycleModal(modal);
    var form = modal.querySelector("form");
    form.owner.value = task.owner;
    form.status.value = task.status;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var isDraft = form.status.value === "Nháp";
      if (!isDraft && (!form.owner.value || !form.deadline.value)) {
        form.owner.setCustomValidity(
          "Cần Owner và deadline trước khi bắt đầu.",
        );
        form.owner.reportValidity();
        return;
      }
      form.owner.setCustomValidity("");
      task.name = form.name.value.trim();
      task.owner = form.owner.value;
      task.deadline = form.deadline.value
        ? form.deadline.value.split("-").reverse().join(".")
        : "";
      task.status = form.status.value;
      if (!editing) cycle.tasks.push(task);
      cycleActivity(
        cycle,
        editing ? "Công việc đã cập nhật" : "Công việc đã tạo",
        task.name,
      );
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openShootingModal(item) {
    var cycle = ensureCycleData(item);
    if (cycle.plan.status !== "approved") {
      if (window.showToast)
        window.showToast(
          "Cần khách duyệt Content Plan trước khi tạo Shooting Plan.",
        );
      return;
    }
    var modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Lịch shooting</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Ngày shooting<input name="date" type="date" required></label><label class="field">Media<select name="media"><option>Media</option><option>Media Hùng</option><option>Media Linh</option></select></label><label class="field">Trạng thái<select name="status"><option>Chờ xác nhận</option><option>Đã xác nhận</option><option>Đã hoàn thành</option></select></label><label class="field">Tài nguyên / link<input name="assets" placeholder="Link script, tư liệu hoặc ghi chú"></label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu lịch shooting</button></div></div></form>';
    bindCycleModal(modal);
    modal.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      cycle.shootings.push({
        date: form.date.value.split("-").reverse().join("."),
        media: form.media.value,
        status: form.status.value,
        assets: form.assets.value.trim(),
      });
      cycleActivity(
        cycle,
        "Lịch shooting đã tạo",
        form.date.value.split("-").reverse().join("."),
      );
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openDemoModal(item) {
    var cycle = ensureCycleData(item),
      demo = cycle.demo,
      modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Post Demo</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Trạng thái<select name="status"><option>Chưa gửi</option><option>Đã gửi</option><option>Cần chỉnh sửa</option><option>Đã duyệt</option></select></label><label class="field">Link Demo<input name="link" type="url" value="' +
      esc(demo.link) +
      '" placeholder="https://..."></label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu Post Demo</button></div></div></form>';
    bindCycleModal(modal);
    var form = modal.querySelector("form");
    form.status.value = demo.status;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      demo.status = form.status.value;
      demo.link = form.link.value.trim();
      if (demo.status === "Đã gửi" && !demo.sentAt) demo.sentAt = "Hôm nay";
      if (demo.status === "Đã duyệt") demo.approvedAt = "Hôm nay";
      cycleActivity(cycle, "Post Demo đã cập nhật", demo.status);
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openPostsModal(item) {
    var cycle = ensureCycleData(item),
      modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Bài đăng chu kỳ</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Kế hoạch trong kỳ<input name="planned" type="number" min="0" required value="' +
      cycle.posts.planned +
      '"></label><label class="field">Đã xuất bản<input name="actual" type="number" min="0" required value="' +
      cycle.posts.actual +
      '"></label><div class="customer-data-rules"><p>Mục tiêu chuẩn: phân phối đều 2–3 bài mỗi tuần cho gói 12 nội dung/tháng.</p></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu bài đăng</button></div></div></form>';
    bindCycleModal(modal);
    modal.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      cycle.posts.planned = Number(form.planned.value);
      cycle.posts.actual = Number(form.actual.value);
      cycleActivity(
        cycle,
        "Tiến độ bài đăng đã cập nhật",
        cycle.posts.actual + " / " + cycle.posts.planned + " đã xuất bản",
      );
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openExceptionModal(item) {
    var cycle = ensureCycleData(item),
      modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Ghi nhận ngoại lệ</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Loại ngoại lệ<select name="type"><option>Chờ khách duyệt</option><option>Có nguy cơ trễ</option><option>Trễ chu kỳ</option><option>Đang bù chu kỳ</option><option>Media quá tải</option></select></label><label class="field">Lý do và hành động tiếp theo<textarea name="reason" required placeholder="Nêu nguyên nhân, người xử lý và mốc theo dõi"></textarea></label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu ngoại lệ</button></div></div></form>';
    bindCycleModal(modal);
    modal.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target,
        exception = { type: form.type.value, reason: form.reason.value.trim() };
      cycle.exceptions.push(exception);
      cycleActivity(cycle, "Ngoại lệ đã ghi nhận", exception.type);
      modal.remove();
      renderCycleWorkspace(item);
    });
  }
  function openProjectStop(item) {
    var currentAccount = window.CKHubActiveAccount || "Tuyền";
    if (
      window.role !== "account" ||
      (item.owner !== currentAccount && item.createdBy !== currentAccount)
    ) {
      if (window.showToast)
        window.showToast(
          "Chỉ Account phụ trách hoặc Account tạo dự án được phép dừng.",
        );
      return;
    }
    var modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Dừng dự án</h2><button class="close" type="button">×</button></div><div class="form"><div class="customer-data-rules"><b>Phân quyền dừng dự án</b><p>Chỉ Account phụ trách hoặc Account tạo dự án được thực hiện. Tiến độ hợp đồng ' +
      item.cycle +
      " / " +
      item.total +
      ' được giữ nguyên.</p></div><label class="field">Lý do dừng<textarea name="reason" required placeholder="Nêu lý do dừng triển khai"></textarea></label><label class="field">Ngày hiệu lực<input name="effectiveDate" type="date" required value="2026-09-22"></label><label class="filter-check"><input name="confirmed" type="checkbox" required> Tôi xác nhận đã kiểm tra ảnh hưởng tới hợp đồng, kế hoạch và công việc.</label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Xác nhận dừng</button></div></div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      item.state = "stopped";
      item.risk = false;
      addActivity(
        item,
        "circle-stop",
        "Dự án đã dừng",
        "Lý do: " + event.target.reason.value.trim(),
      );
      modal.remove();
      renderDetail();
    });
  }
  function openProjectEdit(item) {
    var packages = servicePackages,
      modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Sửa dự án</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Account phụ trách<select name="owner">' +
      owners
        .map(function (owner) {
          return (
            '<option value="' +
            esc(owner) +
            '" ' +
            (owner === item.owner ? "selected" : "") +
            ">" +
            esc(owner) +
            "</option>"
          );
        })
        .join("") +
      '</select></label><label class="field">Gói dịch vụ<select name="servicePackage" required>' +
      packages
        .map(function (service) {
          return (
            '<option value="' +
            esc(service.id) +
            '" ' +
            (service.id === item.servicePackageId ? "selected" : "") +
            ">" +
            esc(service.group + " · " + service.name) +
            "</option>"
          );
        })
        .join("") +
      '</select></label><div class="customer-data-rules"><p>Đổi gói chỉ áp dụng từ thời điểm lưu và tạo snapshot mới cho dự án. Hợp đồng chính và số chu kỳ chỉ quản lý tại Hợp đồng & công nợ. Ngày bắt đầu chu kỳ không sửa ở đây.</p></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu thay đổi</button></div></div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.remove();
    });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target,
        service = packages.find(function (entry) {
          return entry.id === form.servicePackage.value;
        });
      if (!service) return;
      item.owner = form.owner.value;
      item.servicePackageId = service.id;
      item.service = service.group + " · " + service.name;
      item.serviceScope = service.scope;
      item.servicePrice = service.price;
      addActivity(
        item,
        "pencil",
        "Thông tin dự án đã cập nhật",
        "Account, gói dịch vụ hoặc hợp đồng được điều chỉnh.",
      );
      modal.remove();
      renderDetail();
      if (window.showToast) window.showToast("Đã lưu thay đổi dự án.");
    });
  }
  function openOnboarding(item) {
    var data = item.onboarding || {}, modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal onboarding-modal"><div class="modal-top"><h2>Cập nhật Onboarding</h2><button class="close" type="button">×</button></div><div class="form"><div class="customer-data-rules"><b>Điều kiện khởi động</b><p>Account kiểm tra tài liệu và điều phối. Sale, Kế toán xác nhận phần việc thuộc trách nhiệm của họ.</p></div><div class="onboarding-form-section"><b>1. Hợp đồng chính</b><p>' +
      (item.contractCode ? "Đã liên kết " + esc(item.contractCode) : "Chưa liên kết. Tạo hợp đồng chính hiệu lực trước khi khởi động.") +
      '</p><button class="secondary" type="button" id="goContracts"><i data-lucide="file-plus-2"></i> Mở hợp đồng</button></div><div class="onboarding-form-section"><label class="filter-check"><input name="financeVerified" type="checkbox" ' +
      (data.financeVerified ? "checked" : "") +
      '> Kế toán đã xác nhận cọc hoặc thanh toán theo điều khoản</label><label class="field">Mã chứng từ / ghi chú tài chính<input name="financeRef" value="' +
      esc(data.financeRef || "") +
      '" placeholder="Ví dụ: UNC-0926-018"></label></div><div class="onboarding-form-section"><label class="filter-check"><input name="handoverReady" type="checkbox" ' +
      (data.handoverReady ? "checked" : "") +
      '> Sale đã bàn giao Sales Brief và phạm vi đã chốt</label><label class="field">Link Sales Brief<input name="handoverLink" value="' +
      esc(data.handoverLink || "") +
      '" placeholder="Link tài liệu bàn giao"></label></div><div class="onboarding-form-section"><label class="filter-check"><input name="briefReady" type="checkbox" ' +
      (data.briefReady ? "checked" : "") +
      '> Brief và tài liệu nguồn đã đủ để triển khai</label><label class="field">Link brief / thư mục tài liệu<input name="briefLink" value="' +
      esc(data.briefLink || "") +
      '" placeholder="Link brief hoặc thư mục"></label></div><div class="onboarding-form-section"><label class="filter-check"><input name="setupReady" type="checkbox" ' +
      (data.setupReady ? "checked" : "") +
      '> Đã thiết lập workspace và quyền truy cập phù hợp gói dịch vụ</label><label class="field">Ghi chú thiết lập<input name="setupNote" value="' +
      esc(data.setupNote || "") +
      '" placeholder="Ví dụ: Đã cấp quyền Meta Business Suite"></label></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu điều kiện</button></div></div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () { modal.remove(); });
    });
    modal.querySelector("#goContracts").addEventListener("click", function () {
      modal.remove();
      navigate("contracts");
    });
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.remove(); });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      function requiredIfChecked(check, value, label) {
        if (form[check].checked && !form[value].value.trim()) {
          if (window.showToast) window.showToast("Cần bổ sung " + label + ".");
          return false;
        }
        return true;
      }
      if (!requiredIfChecked("financeVerified", "financeRef", "mã chứng từ hoặc ghi chú tài chính") || !requiredIfChecked("handoverReady", "handoverLink", "link Sales Brief") || !requiredIfChecked("briefReady", "briefLink", "link brief hoặc tài liệu") || !requiredIfChecked("setupReady", "setupNote", "ghi chú thiết lập")) return;
      item.onboarding = {
        financeVerified: form.financeVerified.checked,
        financeRef: form.financeRef.value.trim(),
        handoverReady: form.handoverReady.checked,
        handoverLink: form.handoverLink.value.trim(),
        briefReady: form.briefReady.checked,
        briefLink: form.briefLink.value.trim(),
        setupReady: form.setupReady.checked,
        setupNote: form.setupNote.value.trim(),
      };
      addActivity(item, "list-checks", "Đã cập nhật điều kiện Onboarding", onboardingReady(item) ? "Đủ điều kiện khởi động dự án." : "Còn điều kiện cần hoàn tất trước khi khởi động.");
      modal.remove();
      renderDetail();
      if (window.showToast) window.showToast(onboardingReady(item) ? "Đã đủ điều kiện khởi động." : "Đã lưu điều kiện Onboarding.");
    });
    icons();
  }
  function openProjectStart(item) {
    if (!onboardingReady(item)) {
      if (window.showToast) window.showToast("Hoàn tất Cổng khởi động trước khi bắt đầu triển khai.");
      openOnboarding(item);
      return;
    }
    var modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Bắt đầu triển khai</h2><button class="close" type="button">×</button></div><div class="form"><div class="customer-data-rules"><b>Tạo chu kỳ 1</b><p>Cổng khởi động đã hoàn tất. Chọn ngày dự án chính thức bắt đầu; hệ thống tự tạo hạn dự kiến sau một tháng.</p></div><label class="field">Ngày bắt đầu chu kỳ<input name="cycleStart" type="date" required value="2026-10-01"></label><label class="filter-check"><input name="confirmed" type="checkbox" required> Tôi xác nhận bắt đầu triển khai theo điều kiện đã kiểm tra.</label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Bắt đầu triển khai</button></div></div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.remove();
    });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      item.cycleStart = form.cycleStart.value;
      item.due = cycleEnd(item.cycleStart);
      item.cycle = 1;
      item.state = "active";
      item.risk = false;
      item.actualEnd = "";
      item.cycleData = null;
      item.onboardingCompletedAt = formatDate(new Date());
      addActivity(
        item,
        "play",
        "Đã bắt đầu triển khai",
        "Chu kỳ 1: " +
          formatDate(new Date(item.cycleStart + "T00:00:00")) +
          " – " +
          item.due,
      );
      addActivity(
        item,
        "file-text",
        "Đã tạo mốc Content Plan",
        "Hạn gửi bản đầu: " + addBusinessDays(item.cycleStart, 3) + " (T0 + 3 ngày làm việc).",
      );
      modal.remove();
      renderDetail();
      if (window.showToast)
        window.showToast("Đã bắt đầu triển khai và tạo chu kỳ 1.");
    });
  }
  function openActualEnd(item) {
    var modal = document.createElement("div"),
      plannedEnd = plannedEndInput(item);
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Kết thúc thực tế</h2><button class="close" type="button">×</button></div><div class="form"><div class="customer-data-rules"><b>Ngày dự kiến: ' +
      item.due +
      '</b><p>Ngày thực tế được ghi nhận khi chu kỳ hoàn tất. Không làm thay đổi mốc dự kiến hoặc tiến độ hợp đồng.</p></div><label class="field">Ngày kết thúc thực tế<input name="actualEnd" type="date" required value="' +
      (item.actualEnd ? plannedEndInput({ due: item.actualEnd }) : plannedEnd) +
      '"></label><label class="field">Ghi chú<textarea name="actualEndNote" required placeholder="Nêu lý do nếu khác ngày dự kiến"></textarea></label><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Lưu ngày thực tế</button></div></div></form>';
    document.body.appendChild(modal);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.remove();
    });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      item.actualEnd = form.actualEnd.value.split("-").reverse().join(".");
      item.actualEndNote = form.actualEndNote.value.trim();
      addActivity(
        item,
        "calendar-check-2",
        "Đã ghi nhận kết thúc thực tế",
        item.actualEnd + " · " + item.actualEndNote,
      );
      modal.remove();
      renderDetail();
      if (window.showToast)
        window.showToast("Đã ghi nhận ngày kết thúc thực tế.");
    });
  }
  function showInfo(title, message) {
    var modal = document.createElement("div");
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<div class="modal"><div class="modal-top"><h2>' +
      title +
      '</h2><button class="close" type="button">×</button></div><div class="customer-data-rules"><p>' +
      message +
      '</p></div><div class="form-actions"><button class="primary" type="button">Đóng</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
  }
  function normalizeProjectCopy() {
    var search = screen.querySelector("#projectSearchNew");
    if (search) search.placeholder = "Tìm mã dự án, khách hàng, Account…";
  }
  new MutationObserver(normalizeProjectCopy).observe(screen, {
    childList: true,
    subtree: true,
  });
  screen.addEventListener(
    "click",
    function (event) {
      if (!event.target.closest("#projectHelp")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showInfo(
        "Quy tắc dự án",
        "Mỗi dự án thuộc một khách hàng và một Account phụ trách. Dự án nháp chỉ được bắt đầu sau khi Cổng khởi động đủ điều kiện: hợp đồng chính, tài chính, Sales Brief, brief và thiết lập. Chu kỳ luôn tính theo tháng. Dự án tạm dừng hoặc dừng không tự thay đổi số chu kỳ đã triển khai. Task thiếu Owner hoặc deadline không được bắt đầu.",
      );
    },
    true,
  );
  function openProjectCreate() {
    var choices = base.slice().sort(function (a, b) {
        return a[0].localeCompare(b[0], "vi");
      }),
      catalog = window.serviceCatalog || { categories: [], packages: [] },
      packages = catalog.packages.filter(function (item) {
        return item.status === "Đang áp dụng";
      }),
      categories = catalog.categories.filter(function (category) {
        return packages.some(function (item) {
          return item.category === category.id;
        });
      }),
      modal = document.createElement("div");
    if (!packages.length) {
      if (window.showToast)
        window.showToast("Chưa có gói dịch vụ đang áp dụng.");
      return;
    }
    modal.className = "modal-backdrop show customer-modal";
    modal.innerHTML =
      '<form class="modal"><div class="modal-top"><h2>Tạo dự án</h2><button class="close" type="button">×</button></div><div class="form"><label class="field">Khách hàng<input name="customer" type="search" list="projectCustomerOptions" required autocomplete="off" placeholder="Tìm và chọn khách hàng"><datalist id="projectCustomerOptions">' +
      choices
        .map(function (item) {
          return '<option value="' + esc(item[0]) + '">';
        })
        .join("") +
      '</datalist></label><label class="field">Account phụ trách<select name="owner">' +
      owners
        .map(function (owner) {
          return (
            '<option value="' + esc(owner) + '">' + esc(owner) + "</option>"
          );
        })
        .join("") +
      '</select></label><label class="field">Nhóm dịch vụ<select name="serviceCategory">' +
      categories
        .map(function (category) {
          return (
            '<option value="' +
            esc(category.id) +
            '">' +
            esc(category.name) +
            "</option>"
          );
        })
        .join("") +
      '</select></label><label class="field">Gói dịch vụ<select name="servicePackage" required></select></label><div class="customer-data-rules"><p>Dự án được tạo ở trạng thái nháp. Ngày bắt đầu và hạn chu kỳ chỉ được tạo khi Account bấm Bắt đầu triển khai. Gói dịch vụ lấy từ danh mục đang áp dụng và lưu snapshot tại thời điểm tạo.</p></div><div class="form-actions"><button class="secondary" type="button">Hủy</button><button class="primary">Tạo dự án nháp</button></div></div></form>';
    document.body.appendChild(modal);
    var form = modal.querySelector("form"),
      selectedCustomer = null;
    function syncOwner() {
      selectedCustomer = choices.find(function (item) {
        return (
          item[0].toLocaleLowerCase("vi") ===
          form.customer.value.trim().toLocaleLowerCase("vi")
        );
      });
      if (selectedCustomer && form.dataset.customer !== selectedCustomer[0]) {
        form.owner.value = selectedCustomer[1];
        form.dataset.customer = selectedCustomer[0];
      }
      form.customer.setCustomValidity(
        selectedCustomer ? "" : "Chọn khách hàng từ danh sách gợi ý.",
      );
    }
    function syncPackages() {
      var list = packages.filter(function (item) {
        return item.category === form.serviceCategory.value;
      });
      form.servicePackage.innerHTML = list
        .map(function (item) {
          return (
            '<option value="' +
            esc(item.id) +
            '">' +
            esc(item.group) +
            " · " +
            esc(item.name) +
            "</option>"
          );
        })
        .join("");
    }
    syncOwner();
    syncPackages();
    form.customer.addEventListener("input", syncOwner);
    form.serviceCategory.addEventListener("change", syncPackages);
    modal.querySelectorAll(".close,.secondary").forEach(function (button) {
      button.addEventListener("click", function () {
        modal.remove();
      });
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.remove();
    });
    modal.addEventListener("submit", function (event) {
      event.preventDefault();
      syncOwner();
      if (!selectedCustomer) {
        form.customer.reportValidity();
        return;
      }
      var service = packages.find(function (item) {
          return item.id === form.servicePackage.value;
        }),
        index = records.length + 1;
      if (!service) return;
      records.unshift({
        id: "project-" + Date.now(),
        code: "DA-2026-" + String(index).padStart(3, "0"),
        customer: selectedCustomer[0],
        owner: form.owner.value,
        createdBy: "Tuyền",
        area: selectedCustomer[2],
        service: service.group + " · " + service.name,
        servicePackageId: service.id,
        serviceScope: service.scope,
        servicePrice: service.price,
        contractCode: "",
        state: "draft",
        risk: false,
        cycle: 0,
        total: 0,
        progress: 0,
        cycleStart: "",
        due: "",
        posts: 0,
        shooting: 0,
        tasks: 0,
        activities: [
          {
            icon: "file-plus-2",
            title: "Dự án nháp đã tạo",
            detail: "Chờ Account bắt đầu triển khai và tạo chu kỳ 1.",
          },
        ],
      });
      state.kpi = "all";
      state.page = 1;
      modal.remove();
      render();
    });
  }
  screen.addEventListener(
    "click",
    function (event) {
      if (!event.target.closest("#createProject")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openProjectCreate();
    },
    true,
  );
  document.addEventListener(
    "click",
    function (event) {
      var control = event.target.closest("#toggleProjectState");
      if (!control || !state.selected) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.selected.state === "active") openProjectStop(state.selected);
      else if (state.selected.state === "draft") openProjectStart(state.selected);
      else {
        state.selected.state = "active";
        addActivity(
          state.selected,
          "play",
          "Đã tiếp tục triển khai",
          "Tiến độ hợp đồng được giữ nguyên.",
        );
        renderDetail();
      }
    },
    true,
  );
  render();
})();
