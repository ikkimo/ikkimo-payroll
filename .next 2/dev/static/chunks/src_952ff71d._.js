(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-client] (ecmascript) <locals>");
;
const url = ("TURBOPACK compile-time value", "https://utebwzqwkjqzcrmtdsue.supabase.co");
const key = ("TURBOPACK compile-time value", "sb_publishable_fH-hT37WfrMAA25UqBW5TA_e_jJ_MS_");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, key);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/employees/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SORT_OPTIONS",
    ()=>SORT_OPTIONS
]);
const SORT_OPTIONS = [
    {
        value: "internal_no",
        label: "No."
    },
    {
        value: "employee_code",
        label: "No. ID Karyawan"
    },
    {
        value: "employee_name",
        label: "Name Lengkap"
    },
    {
        value: "start_date",
        label: "Start date"
    },
    {
        value: "department",
        label: "Department"
    },
    {
        value: "position",
        label: "Posisi"
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/employees/EmployeesHeaderControls.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EmployeesHeaderControls
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/employees/types.ts [app-client] (ecmascript)");
"use client";
;
;
;
function EmployeesHeaderControls(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(43);
    if ($[0] !== "79ccf14a2277397dbe704247719caffda00e8f0951d5644e901c99fc0d352ad7") {
        for(let $i = 0; $i < 43; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "79ccf14a2277397dbe704247719caffda00e8f0951d5644e901c99fc0d352ad7";
    }
    const { employees, search, setSearch, departmentFilter, setDepartmentFilter, sortBy, setSortBy } = t0;
    let t1;
    if ($[1] !== employees) {
        t1 = [
            ...new Set(employees.map(_EmployeesHeaderControlsEmployeesMap).filter(Boolean))
        ].sort(_EmployeesHeaderControlsAnonymous);
        $[1] = employees;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const departmentOptions = t1;
    let t2;
    if ($[3] !== departmentFilter || $[4] !== search || $[5] !== sortBy) {
        t2 = departmentFilter !== "all" || search.trim() || sortBy !== "internal_no";
        $[3] = departmentFilter;
        $[4] = search;
        $[5] = sortBy;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    const showReset = t2;
    let t3;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm font-semibold",
            children: "Employees"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 54,
            columnNumber: 10
        }, this);
        $[7] = t3;
    } else {
        t3 = $[7];
    }
    let t4;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "hidden sm:inline",
            children: "Search"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 61,
            columnNumber: 10
        }, this);
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== setSearch) {
        t5 = ({
            "EmployeesHeaderControls[<input>.onChange]": (e_0)=>setSearch(e_0.target.value)
        })["EmployeesHeaderControls[<input>.onChange]"];
        $[9] = setSearch;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    let t6;
    if ($[11] !== search || $[12] !== t5) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex w-full items-center gap-2 text-xs sm:w-auto",
            children: [
                t4,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: search,
                    onChange: t5,
                    placeholder: "Search\u2026",
                    className: "w-full min-w-0 sm:w-56 rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]"
                }, void 0, false, {
                    fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
                    lineNumber: 78,
                    columnNumber: 82
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 78,
            columnNumber: 10
        }, this);
        $[11] = search;
        $[12] = t5;
        $[13] = t6;
    } else {
        t6 = $[13];
    }
    let t7;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            children: "Filter"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 87,
            columnNumber: 10
        }, this);
        $[14] = t7;
    } else {
        t7 = $[14];
    }
    let t8;
    if ($[15] !== setDepartmentFilter) {
        t8 = ({
            "EmployeesHeaderControls[<select>.onChange]": (e_1)=>setDepartmentFilter(e_1.target.value)
        })["EmployeesHeaderControls[<select>.onChange]"];
        $[15] = setDepartmentFilter;
        $[16] = t8;
    } else {
        t8 = $[16];
    }
    let t9;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "all",
            children: "All"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 104,
            columnNumber: 10
        }, this);
        $[17] = t9;
    } else {
        t9 = $[17];
    }
    let t10;
    if ($[18] !== departmentOptions) {
        t10 = departmentOptions.map(_EmployeesHeaderControlsDepartmentOptionsMap);
        $[18] = departmentOptions;
        $[19] = t10;
    } else {
        t10 = $[19];
    }
    let t11;
    if ($[20] !== departmentFilter || $[21] !== t10 || $[22] !== t8) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-2 text-xs",
            children: [
                t7,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: departmentFilter,
                    onChange: t8,
                    className: "rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]",
                    children: [
                        t9,
                        t10
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
                    lineNumber: 119,
                    columnNumber: 66
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 119,
            columnNumber: 11
        }, this);
        $[20] = departmentFilter;
        $[21] = t10;
        $[22] = t8;
        $[23] = t11;
    } else {
        t11 = $[23];
    }
    let t12;
    if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            children: "Sort"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 129,
            columnNumber: 11
        }, this);
        $[24] = t12;
    } else {
        t12 = $[24];
    }
    let t13;
    if ($[25] !== setSortBy) {
        t13 = ({
            "EmployeesHeaderControls[<select>.onChange]": (e_2)=>setSortBy(e_2.target.value)
        })["EmployeesHeaderControls[<select>.onChange]"];
        $[25] = setSortBy;
        $[26] = t13;
    } else {
        t13 = $[26];
    }
    let t14;
    if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SORT_OPTIONS"].map(_EmployeesHeaderControlsSORT_OPTIONSMap);
        $[27] = t14;
    } else {
        t14 = $[27];
    }
    let t15;
    if ($[28] !== sortBy || $[29] !== t13) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-2 text-xs",
            children: [
                t12,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: sortBy,
                    onChange: t13,
                    className: "rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]",
                    children: t14
                }, void 0, false, {
                    fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
                    lineNumber: 153,
                    columnNumber: 67
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 153,
            columnNumber: 11
        }, this);
        $[28] = sortBy;
        $[29] = t13;
        $[30] = t15;
    } else {
        t15 = $[30];
    }
    let t16;
    if ($[31] !== setDepartmentFilter || $[32] !== setSearch || $[33] !== setSortBy || $[34] !== showReset) {
        t16 = showReset && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            className: "text-[11px] underline underline-offset-4 opacity-70 hover:opacity-100",
            onClick: {
                "EmployeesHeaderControls[<button>.onClick]": ()=>{
                    setDepartmentFilter("all");
                    setSearch("");
                    setSortBy("internal_no");
                }
            }["EmployeesHeaderControls[<button>.onClick]"],
            children: "Reset"
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 162,
            columnNumber: 24
        }, this);
        $[31] = setDepartmentFilter;
        $[32] = setSearch;
        $[33] = setSortBy;
        $[34] = showReset;
        $[35] = t16;
    } else {
        t16 = $[35];
    }
    let t17;
    if ($[36] !== t11 || $[37] !== t15 || $[38] !== t16) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mt-2 flex flex-wrap items-center justify-end gap-2",
            children: [
                t11,
                t15,
                t16
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 179,
            columnNumber: 11
        }, this);
        $[36] = t11;
        $[37] = t15;
        $[38] = t16;
        $[39] = t17;
    } else {
        t17 = $[39];
    }
    let t18;
    if ($[40] !== t17 || $[41] !== t6) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "border-b border-[var(--ikkimo-border)] px-5 py-4",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
                children: [
                    t3,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex w-full flex-col items-stretch sm:w-auto sm:items-end",
                        children: [
                            t6,
                            t17
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
                        lineNumber: 189,
                        columnNumber: 164
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
                lineNumber: 189,
                columnNumber: 77
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
            lineNumber: 189,
            columnNumber: 11
        }, this);
        $[40] = t17;
        $[41] = t6;
        $[42] = t18;
    } else {
        t18 = $[42];
    }
    return t18;
}
_c = EmployeesHeaderControls;
function _EmployeesHeaderControlsSORT_OPTIONSMap(o) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
        value: o.value,
        children: o.label
    }, o.value, false, {
        fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
        lineNumber: 199,
        columnNumber: 10
    }, this);
}
function _EmployeesHeaderControlsDepartmentOptionsMap(dep) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
        value: dep,
        children: dep
    }, dep, false, {
        fileName: "[project]/src/components/employees/EmployeesHeaderControls.tsx",
        lineNumber: 202,
        columnNumber: 10
    }, this);
}
function _EmployeesHeaderControlsAnonymous(a, b) {
    return a.localeCompare(b, "en", {
        sensitivity: "base"
    });
}
function _EmployeesHeaderControlsEmployeesMap(e) {
    return (e.department ?? "").trim();
}
var _c;
__turbopack_context__.k.register(_c, "EmployeesHeaderControls");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/employees/EmployeesTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EmployeesTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
"use client";
;
;
function EmployeesTable(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(9);
    if ($[0] !== "1edc18755e47e9961c22f9831023d11dbdb2a3a7a00a71601fd709fe9118745a") {
        for(let $i = 0; $i < 9; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "1edc18755e47e9961c22f9831023d11dbdb2a3a7a00a71601fd709fe9118745a";
    }
    const { loading, employees, rows, formatDate } = t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
            className: "text-xs",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "No."
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 41
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "No. ID Karyawan"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 75
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "Nama Panggilan"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 121
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "Nama Lengkap"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 166
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "Department"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 209
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "Posisi"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 250
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-5 py-3",
                        children: "Start date"
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 27,
                        columnNumber: 287
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                lineNumber: 27,
                columnNumber: 37
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
            lineNumber: 27,
            columnNumber: 10
        }, this);
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    let t2;
    if ($[2] !== employees || $[3] !== formatDate || $[4] !== loading || $[5] !== rows) {
        t2 = loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-5 py-4 text-sm",
                colSpan: 7,
                children: "Loading…"
            }, void 0, false, {
                fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                lineNumber: 34,
                columnNumber: 24
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
            lineNumber: 34,
            columnNumber: 20
        }, this) : employees.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-5 py-4 text-sm",
                colSpan: 7,
                children: "No employee rows available yet (or blocked by RLS)."
            }, void 0, false, {
                fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                lineNumber: 34,
                columnNumber: 120
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
            lineNumber: 34,
            columnNumber: 116
        }, this) : rows.map({
            "EmployeesTable[rows.map()]": (e)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                    className: "border-t border-[var(--ikkimo-border)] hover:bg-[var(--ikkimo-brand-hover)] cursor-pointer",
                    onClick: {
                        "EmployeesTable[rows.map() > <tr>.onClick]": ()=>{
                            window.location.href = `/employee/${e.uuid}`;
                        }
                    }["EmployeesTable[rows.map() > <tr>.onClick]"],
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.internal_no
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 55
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.employee_code
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 101
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.preferred_name ?? "-"
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 149
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.employee_name
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 205
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.department ?? "-"
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 253
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: e.position ?? "-"
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 305
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-5 py-3",
                            children: formatDate(e.start_date)
                        }, void 0, false, {
                            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                            lineNumber: 39,
                            columnNumber: 355
                        }, this)
                    ]
                }, e.uuid, true, {
                    fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                    lineNumber: 35,
                    columnNumber: 42
                }, this)
        }["EmployeesTable[rows.map()]"]);
        $[2] = employees;
        $[3] = formatDate;
        $[4] = loading;
        $[5] = rows;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    let t3;
    if ($[7] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "overflow-x-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full text-left text-sm",
                children: [
                    t1,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        className: "border-t border-[var(--ikkimo-border)]",
                        children: t2
                    }, void 0, false, {
                        fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                        lineNumber: 51,
                        columnNumber: 91
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/employees/EmployeesTable.tsx",
                lineNumber: 51,
                columnNumber: 43
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/employees/EmployeesTable.tsx",
            lineNumber: 51,
            columnNumber: 10
        }, this);
        $[7] = t2;
        $[8] = t3;
    } else {
        t3 = $[8];
    }
    return t3;
}
_c = EmployeesTable;
var _c;
__turbopack_context__.k.register(_c, "EmployeesTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(authed)/home/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$EmployeesHeaderControls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/employees/EmployeesHeaderControls.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$EmployeesTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/employees/EmployeesTable.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
function nowYearMonth() {
    const d = new Date();
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1
    };
}
function isMissingColumnError(error, column) {
    if (!error || typeof error !== "object") return false;
    const msg = "message" in error && typeof error.message === "string" ? error.message : "";
    const lower = msg.toLowerCase();
    return lower.includes(column.toLowerCase()) && (lower.includes("does not exist") || lower.includes("column"));
}
function monthName(m) {
    if (!m || m < 1 || m > 12) return "";
    return [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ][m - 1];
}
const formatDateEn = (iso)=>{
    if (!iso) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(iso));
};
function HomePage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(54);
    if ($[0] !== "7eea257c51ced97fcd634cb3d864609a0a5f18dce25f26a585d1f6a05527179c") {
        for(let $i = 0; $i < 54; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "7eea257c51ced97fcd634cb3d864609a0a5f18dce25f26a585d1f6a05527179c";
    }
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [employees, setEmployees] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    const [sortBy, setSortBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("internal_no");
    const [departmentFilter, setDepartmentFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    let t1;
    if ($[2] !== departmentFilter || $[3] !== employees || $[4] !== search) {
        const q = search.trim().toLowerCase();
        t1 = employees.filter({
            "HomePage[employees.filter()]": (e)=>{
                if (departmentFilter !== "all") {
                    if ((e.department ?? "").trim() !== departmentFilter) {
                        return false;
                    }
                }
                if (!q) {
                    return true;
                }
                const hay = [
                    e.employee_name,
                    e.preferred_name ?? "",
                    e.employee_code,
                    String(e.internal_no ?? ""),
                    e.department ?? "",
                    e.position ?? ""
                ].join(" ").toLowerCase();
                return hay.includes(q);
            }
        }["HomePage[employees.filter()]"]);
        $[2] = departmentFilter;
        $[3] = employees;
        $[4] = search;
        $[5] = t1;
    } else {
        t1 = $[5];
    }
    const filteredEmployees = t1;
    let list;
    if ($[6] !== filteredEmployees || $[7] !== sortBy) {
        list = [
            ...filteredEmployees
        ];
        const safeStr = _HomePageSafeStr;
        let t2;
        if ($[9] !== sortBy) {
            t2 = ({
                "HomePage[list.sort()]": (a, b)=>{
                    switch(sortBy){
                        case "internal_no":
                            {
                                const ai = a.internal_no && a.internal_no > 0 ? a.internal_no : Number.POSITIVE_INFINITY;
                                const bi = b.internal_no && b.internal_no > 0 ? b.internal_no : Number.POSITIVE_INFINITY;
                                return ai - bi;
                            }
                        case "employee_code":
                            {
                                return safeStr(a.employee_code).localeCompare(safeStr(b.employee_code), "en", {
                                    numeric: true,
                                    sensitivity: "base"
                                });
                            }
                        case "employee_name":
                            {
                                return safeStr(a.employee_name).localeCompare(safeStr(b.employee_name), "en", {
                                    sensitivity: "base"
                                });
                            }
                        case "department":
                            {
                                return safeStr(a.department).localeCompare(safeStr(b.department), "en", {
                                    sensitivity: "base"
                                });
                            }
                        case "position":
                            {
                                return safeStr(a.position).localeCompare(safeStr(b.position), "en", {
                                    sensitivity: "base"
                                });
                            }
                        case "start_date":
                            {
                                const ta = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
                                const tb = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
                                return ta - tb;
                            }
                        default:
                            {
                                return 0;
                            }
                    }
                }
            })["HomePage[list.sort()]"];
            $[9] = sortBy;
            $[10] = t2;
        } else {
            t2 = $[10];
        }
        list.sort(t2);
        $[6] = filteredEmployees;
        $[7] = sortBy;
        $[8] = list;
    } else {
        list = $[8];
    }
    const sortedEmployees = list;
    const [period, setPeriod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [periodError, setPeriodError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [periodLoading, setPeriodLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    let t2;
    let t3;
    if ($[11] !== router) {
        t2 = ({
            "HomePage[useEffect()]": ()=>{
                let alive = true;
                (async ()=>{
                    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                    const session = data.session;
                    if (!session) {
                        router.replace("/login");
                        return;
                    }
                    if (!alive) {
                        return;
                    }
                    setEmail(session.user.email ?? "");
                    const employeesPromise = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("employees").select("uuid, internal_no, employee_code, preferred_name, employee_name, department, position, start_date, active, base_salary, current_salary, seniority_grades(grade, increase_monthly_idr), skill_grades(position, level, increase_monthly_idr)").eq("active", true).order("internal_no", {
                        ascending: true
                    }).limit(500);
                    const { year, month } = nowYearMonth();
                    const empRes = await employeesPromise;
                    if (!alive) {
                        return;
                    }
                    if (empRes.error) {
                        console.error(empRes.error);
                        setEmployees([]);
                    } else {
                        setEmployees(empRes.data ?? []);
                    }
                    let periodRow = null;
                    let periodErr = null;
                    const thisRes = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("payroll_periods").select("id, year, month, working_days, red_days").eq("year", year).eq("month", month).maybeSingle();
                    if (thisRes.error) {
                        if (isMissingColumnError(thisRes.error, "red_days")) {
                            const thisNoRed = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("payroll_periods").select("id, year, month, working_days").eq("year", year).eq("month", month).maybeSingle();
                            if (thisNoRed.error) {
                                periodErr = thisNoRed.error.message;
                            } else {
                                periodRow = thisNoRed.data ?? null;
                            }
                        } else {
                            periodErr = thisRes.error.message;
                        }
                    } else {
                        periodRow = thisRes.data ?? null;
                    }
                    if (!periodRow) {
                        const latestRes = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("payroll_periods").select("id, year, month, working_days, red_days").order("year", {
                            ascending: false
                        }).order("month", {
                            ascending: false
                        }).limit(1);
                        if (latestRes.error) {
                            if (isMissingColumnError(latestRes.error, "red_days")) {
                                const latestNoRed = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("payroll_periods").select("id, year, month, working_days").order("year", {
                                    ascending: false
                                }).order("month", {
                                    ascending: false
                                }).limit(1);
                                if (latestNoRed.error) {
                                    periodErr = latestNoRed.error.message;
                                } else {
                                    periodRow = latestNoRed.data?.[0] ?? null;
                                }
                            } else {
                                periodErr = latestRes.error.message;
                            }
                        } else {
                            periodRow = latestRes.data?.[0] ?? null;
                        }
                    }
                    setPeriod(periodRow);
                    setPeriodError(periodErr);
                    if (periodErr) {
                        console.error("payroll_periods error:", periodErr);
                    }
                    setPeriodLoading(false);
                    setLoading(false);
                })();
                return ()=>{
                    alive = false;
                };
            }
        })["HomePage[useEffect()]"];
        t3 = [
            router
        ];
        $[11] = router;
        $[12] = t2;
        $[13] = t3;
    } else {
        t2 = $[12];
        t3 = $[13];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t2, t3);
    let t4;
    if ($[14] !== router) {
        t4 = async function logout() {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
            router.replace("/login");
        };
        $[14] = router;
        $[15] = t4;
    } else {
        t4 = $[15];
    }
    const logout = t4;
    let t5;
    let t6;
    if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            src: "/ikkimo_logo.png",
            alt: "iKKim\u2019O",
            width: 36,
            height: 36,
            priority: true
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 279,
            columnNumber: 10
        }, this);
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm font-semibold",
            children: "iKKim’O Payroll"
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 280,
            columnNumber: 10
        }, this);
        $[16] = t5;
        $[17] = t6;
    } else {
        t5 = $[16];
        t6 = $[17];
    }
    let t7;
    if ($[18] !== email) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-3",
            children: [
                t5,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        t6,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-xs",
                            children: email
                        }, void 0, false, {
                            fileName: "[project]/src/app/(authed)/home/page.tsx",
                            lineNumber: 289,
                            columnNumber: 64
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 289,
                    columnNumber: 55
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 289,
            columnNumber: 10
        }, this);
        $[18] = email;
        $[19] = t7;
    } else {
        t7 = $[19];
    }
    let t8;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            href: "/settings",
            className: "rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]",
            children: "Settings"
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 297,
            columnNumber: 10
        }, this);
        $[20] = t8;
    } else {
        t8 = $[20];
    }
    let t9;
    if ($[21] !== logout) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-3",
            children: [
                t8,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: logout,
                    className: "rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]",
                    children: "Logout"
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 304,
                    columnNumber: 55
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 304,
            columnNumber: 10
        }, this);
        $[21] = logout;
        $[22] = t9;
    } else {
        t9 = $[22];
    }
    let t10;
    if ($[23] !== t7 || $[24] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
            className: "border-b border-[var(--ikkimo-border)] bg-white",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4",
                children: [
                    t7,
                    t9
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(authed)/home/page.tsx",
                lineNumber: 312,
                columnNumber: 79
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 312,
            columnNumber: 11
        }, this);
        $[23] = t7;
        $[24] = t9;
        $[25] = t10;
    } else {
        t10 = $[25];
    }
    let t11;
    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm font-semibold",
            children: "Current period"
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 321,
            columnNumber: 11
        }, this);
        $[26] = t11;
    } else {
        t11 = $[26];
    }
    let t12;
    if ($[27] !== period || $[28] !== periodError || $[29] !== periodLoading) {
        t12 = periodLoading ? "Loading\u2026" : periodError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm",
            children: [
                "Could not load payroll period: ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "font-medium",
                    children: periodError
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 328,
                    columnNumber: 115
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 328,
            columnNumber: 59
        }, this) : !period ? "No payroll period found yet. Create one in payroll_periods." : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-1",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-lg font-semibold",
                    children: `${monthName(period.month)} ${period.year ?? ""}`.trim()
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 328,
                    columnNumber: 275
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm",
                    children: [
                        "Working days: ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "font-medium",
                            children: period.working_days ?? "\u2014"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(authed)/home/page.tsx",
                            lineNumber: 328,
                            columnNumber: 417
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 328,
                    columnNumber: 378
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm",
                    children: [
                        "Red days: ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "font-medium",
                            children: period.red_days ?? "\u2014"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(authed)/home/page.tsx",
                            lineNumber: 328,
                            columnNumber: 528
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 328,
                    columnNumber: 493
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 328,
            columnNumber: 248
        }, this);
        $[27] = period;
        $[28] = periodError;
        $[29] = periodLoading;
        $[30] = t12;
    } else {
        t12 = $[30];
    }
    let t13;
    if ($[31] !== t12) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "flex-1 rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5",
            children: [
                t11,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-2 text-sm",
                    children: t12
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 338,
                    columnNumber: 106
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 338,
            columnNumber: 11
        }, this);
        $[31] = t12;
        $[32] = t13;
    } else {
        t13 = $[32];
    }
    let t14;
    if ($[33] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "flex-1 rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm font-semibold",
                    children: "Monthly session"
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 346,
                    columnNumber: 101
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-2 text-sm",
                    children: "Create a monthly input run for the selected payroll period."
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 346,
                    columnNumber: 161
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    disabled: true,
                    className: "mt-4 w-full rounded-xl bg-[var(--ikkimo-brand)] py-2.5 text-sm font-semibold text-white disabled:opacity-100 disabled:cursor-not-allowed",
                    title: "We\u2019ll enable this once periods + input table are wired.",
                    children: "Start payroll session"
                }, void 0, false, {
                    fileName: "[project]/src/app/(authed)/home/page.tsx",
                    lineNumber: 346,
                    columnNumber: 256
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 346,
            columnNumber: 11
        }, this);
        $[33] = t14;
    } else {
        t14 = $[33];
    }
    let t15;
    if ($[34] !== t13) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col gap-4 sm:flex-row sm:items-stretch",
            children: [
                t13,
                t14
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 353,
            columnNumber: 11
        }, this);
        $[34] = t13;
        $[35] = t15;
    } else {
        t15 = $[35];
    }
    let t16;
    if ($[36] !== departmentFilter || $[37] !== employees || $[38] !== search || $[39] !== sortBy) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$EmployeesHeaderControls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            employees: employees,
            search: search,
            setSearch: setSearch,
            departmentFilter: departmentFilter,
            setDepartmentFilter: setDepartmentFilter,
            sortBy: sortBy,
            setSortBy: setSortBy
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 361,
            columnNumber: 11
        }, this);
        $[36] = departmentFilter;
        $[37] = employees;
        $[38] = search;
        $[39] = sortBy;
        $[40] = t16;
    } else {
        t16 = $[40];
    }
    let t17;
    if ($[41] !== employees || $[42] !== loading || $[43] !== sortedEmployees) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$employees$2f$EmployeesTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            loading: loading,
            employees: employees,
            rows: sortedEmployees,
            formatDate: formatDateEn
        }, void 0, false, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 372,
            columnNumber: 11
        }, this);
        $[41] = employees;
        $[42] = loading;
        $[43] = sortedEmployees;
        $[44] = t17;
    } else {
        t17 = $[44];
    }
    let t18;
    if ($[45] !== t16 || $[46] !== t17) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "mt-6 rounded-2xl border border-[var(--ikkimo-border)] bg-white",
            children: [
                t16,
                t17
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 382,
            columnNumber: 11
        }, this);
        $[45] = t16;
        $[46] = t17;
        $[47] = t18;
    } else {
        t18 = $[47];
    }
    let t19;
    if ($[48] !== t15 || $[49] !== t18) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "mx-auto max-w-6xl px-6 py-6",
            children: [
                t15,
                t18
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 391,
            columnNumber: 11
        }, this);
        $[48] = t15;
        $[49] = t18;
        $[50] = t19;
    } else {
        t19 = $[50];
    }
    let t20;
    if ($[51] !== t10 || $[52] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[var(--ikkimo-bg)] text-[var(--ikkimo-text)]",
            children: [
                t10,
                t19
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(authed)/home/page.tsx",
            lineNumber: 400,
            columnNumber: 11
        }, this);
        $[51] = t10;
        $[52] = t19;
        $[53] = t20;
    } else {
        t20 = $[53];
    }
    return t20;
}
_s(HomePage, "cdTlGDx59CulzByoKd4xprRZUEw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = HomePage;
function _HomePageSafeStr(v) {
    return (v ?? "").trim();
}
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_952ff71d._.js.map