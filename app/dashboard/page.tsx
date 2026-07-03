"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STATUSES: Record<string, { label: string; color: string }> = { new: { label: "Новый", color: "#c8a96e" }, in_progress: { label: "В работе", color: "#64b5f6" }, done: { label: "Готов", color: "#81c784" }, delivered: { label: "Доставлен", color: "#888" }, cancellation_requested: { label: "Запрос отмены", color: "#ff9800" }, cancelled: { label: "Отменён", color: "#e57373" } };
const CANCEL_APPROVERS = ["Дархан", "Айдын"];
const TABS = ["Обзор", "Заказы", "Клиенты", "Расходы", "Производство", "Аналитика ИИ", "Настройки"];
const PROD_FLAVORS = ["ВУПИ", "МОЛОЧКА", "ЯГОДНЫЙ", "НУТЕЛЛА", "СНИКЕРС", "СГУЩЕНКА ОРЕХ"];
const FLAVOR_COLORS: Record<string, string> = { "ВУПИ": "#f06292", "МОЛОЧКА": "#64b5f6", "ЯГОДНЫЙ": "#81c784", "НУТЕЛЛА": "#a1887f", "СНИКЕРС": "#ffb74d", "СГУЩЕНКА ОРЕХ": "#e57373" };
const PIE_COLORS_PROD = ["#c8a96e","#64b5f6","#81c784","#e57373","#f06292","#ffb74d"];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [tab, setTab] = useState(0);
  const [todayStats, setTodayStats] = useState({ orders: 0, cakes: 0 });
  const [totalOrders, setTotalOrders] = useState(0);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [flavorStats, setFlavorStats] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [notification, setNotification] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: new Date().toISOString().slice(0,10), order_time: "", address: "", notes: "", total_amount: "", payment_type: "" });
  const [addClientQuery, setAddClientQuery] = useState("");
  const [addClientSuggestions, setAddClientSuggestions] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSyncing, setExpenseSyncing] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [expForm, setExpForm] = useState({ description: "", category: "ингредиенты", unit: "", quantity_amount: "", payment_type: "нал", amount: "", expense_date: new Date().toISOString().slice(0,10) });
  const [expDescSuggestions, setExpDescSuggestions] = useState<string[]>([]);
  const [expSaving, setExpSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" });
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: "", role: "", pin: "" });
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderEditForm, setOrderEditForm] = useState<any>({});
  const [recipes, setRecipes] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [prodMonth, setProdMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [recipeForm, setRecipeForm] = useState<any>({ flavor: "", yield_count: 12, notes: "", ingredients: [] });
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [prodSubTab, setProdSubTab] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ name: "", unit: "г", category: "ингредиент", notes: "" });
  const [showPrihodModal, setShowPrihodModal] = useState(false);
  const [prihodProduct, setPrihodProduct] = useState<any>(null);
  const [prihodForm, setPrihodForm] = useState({ quantity: "", amount: "", payment_type: "нал", date: new Date().toISOString().slice(0,10) });
  const [savingPrihod, setSavingPrihod] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionActuals, setRevisionActuals] = useState<Record<string, string>>({});
  const [revisionNotes, setRevisionNotes] = useState("");
  const [savingRevision, setSavingRevision] = useState(false);

  // Unit normalization helpers
  const toBaseUnit = (amount: number, unit: string): { val: number; base: string } => {
    const u = (unit || "г").toLowerCase().trim();
    if (u === "кг") return { val: amount * 1000, base: "г" };
    if (u === "л") return { val: amount * 1000, base: "мл" };
    return { val: amount, base: u };
  };

  const fromBase = (val: number, base: string): string => {
    if ((base === "г" || base === "мл") && val >= 1000) return `${(val / 1000).toFixed(2)} ${base === "г" ? "кг" : "л"}`;
    return `${Math.round(val)} ${base}`;
  };

  const calcExpectedStock = () => {
    // Gather all unique ingredients from recipes
    const ingredientKeys: Set<string> = new Set();
    recipes.forEach((r) => (r.ingredients || []).forEach((ing: any) => { if (ing.name) ingredientKeys.add(ing.name); }));

    const result: Record<string, { base: string; purchased: number; consumed: number; expected: number }> = {};

    // Init
    ingredientKeys.forEach((key) => {
      const sampleUnit = (() => {
        for (const r of recipes) {
          const ing = (r.ingredients || []).find((i: any) => i.name === key);
          if (ing?.unit) return toBaseUnit(0, ing.unit).base;
        }
        return "г";
      })();
      result[key] = { base: sampleUnit, purchased: 0, consumed: 0, expected: 0 };
    });

    // Purchases: match expense description to ingredient name
    expenses.forEach((e) => {
      if (e.category !== "ингредиенты" || !e.quantity_amount) return;
      const descLower = (e.description || "").toLowerCase();
      ingredientKeys.forEach((key) => {
        const keyLower = key.toLowerCase();
        if (descLower.includes(keyLower) || keyLower.split(" ").some((w: string) => w.length > 3 && descLower.includes(w))) {
          const { val } = toBaseUnit(parseFloat(e.quantity_amount) || 0, e.unit || "г");
          result[key].purchased += val;
        }
      });
    });

    // Consumption: production × recipe
    production.forEach((p) => {
      const recipe = recipes.find((r) => r.flavor === p.flavor);
      if (!recipe) return;
      const batches = (p.quantity || 0) / (recipe.yield_count || 1);
      (recipe.ingredients || []).forEach((ing: any) => {
        if (!ing.name || !ing.amount) return;
        const { val } = toBaseUnit(parseFloat(ing.amount) * batches, ing.unit || "г");
        if (result[ing.name]) result[ing.name].consumed += val;
      });
    });

    // Expected = purchased - consumed
    Object.keys(result).forEach((k) => { result[k].expected = result[k].purchased - result[k].consumed; });
    return result;
  };

  const calcShoppingList = (stock: ReturnType<typeof calcExpectedStock>) => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = orders.filter((o) => (o.order_date || "") >= today && !["cancelled","delivered"].includes(o.status || ""));
    const needed: Record<string, { base: string; required: number }> = {};

    upcoming.forEach((o) => {
      const recipe = recipes.find((r) => r.flavor === o.cake_flavor);
      if (!recipe) return;
      const qty = o.quantity || 1;
      (recipe.ingredients || []).forEach((ing: any) => {
        if (!ing.name || !ing.amount) return;
        if (!needed[ing.name]) needed[ing.name] = { base: toBaseUnit(0, ing.unit || "г").base, required: 0 };
        const { val } = toBaseUnit(parseFloat(ing.amount) * qty, ing.unit || "г");
        needed[ing.name].required += val;
      });
    });

    return Object.entries(needed).map(([name, { base, required }]) => {
      const have = stock[name]?.expected || 0;
      const deficit = required - have;
      return { name, required, have, deficit, base, needToBuy: deficit > 0 };
    }).filter((i) => i.required > 0).sort((a, b) => (b.needToBuy ? 1 : 0) - (a.needToBuy ? 1 : 0));
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("berrycake_products").select("*").order("category").order("name");
    if (data) setProducts(data);
  };

  const saveProduct = async () => {
    const payload = { name: productForm.name, unit: productForm.unit, category: productForm.category, notes: productForm.notes || null };
    if (editingProduct) {
      await supabase.from("berrycake_products").update(payload).eq("id", editingProduct.id);
    } else {
      await supabase.from("berrycake_products").insert(payload);
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({ name: "", unit: "г", category: "ингредиент", notes: "" });
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Удалить товар из каталога?")) return;
    await supabase.from("berrycake_products").delete().eq("id", id);
    fetchProducts();
  };

  const openPrihod = (p: any) => {
    setPrihodProduct(p);
    setPrihodForm({ quantity: "", amount: "", payment_type: "нал", date: new Date().toISOString().slice(0,10) });
    setShowPrihodModal(true);
  };

  const savePrihod = async () => {
    if (!prihodForm.quantity || !prihodForm.amount) return;
    setSavingPrihod(true);
    const auth = JSON.parse(localStorage.getItem("bc_auth") || "{}");
    const catMap: Record<string, string> = { "ингредиент": "ингредиенты", "упаковка": "упаковка", "прочее": "прочее" };
    await supabase.from("berrycake_expenses").insert({
      description: prihodProduct.name,
      category: catMap[prihodProduct.category] || "прочее",
      amount: parseFloat(prihodForm.amount),
      quantity_amount: parseFloat(prihodForm.quantity),
      unit: prihodProduct.unit,
      payment_type: prihodForm.payment_type,
      expense_date: prihodForm.date,
      confirmed_by: auth.name || null,
    });
    setSavingPrihod(false);
    setShowPrihodModal(false);
    fetchExpenses();
  };

  const getProductStock = (product: any) => {
    const { base } = toBaseUnit(0, product.unit);
    let purchased = 0;
    expenses.forEach((e) => {
      if (!e.quantity_amount) return;
      const desc = (e.description || "").toLowerCase();
      const name = product.name.toLowerCase();
      if (desc.includes(name) || name.includes(desc)) {
        const { val } = toBaseUnit(parseFloat(e.quantity_amount) || 0, e.unit || product.unit);
        purchased += val;
      }
    });
    let consumed = 0;
    production.forEach((p) => {
      const recipe = recipes.find((r) => r.flavor === p.flavor);
      if (!recipe) return;
      const batches = (p.quantity || 0) / (recipe.yield_count || 1);
      (recipe.ingredients || []).forEach((ing: any) => {
        if (!ing.name || !ing.amount) return;
        const ingName = ing.name.toLowerCase();
        const prodName = product.name.toLowerCase();
        if (ingName.includes(prodName) || prodName.includes(ingName)) {
          const { val } = toBaseUnit(parseFloat(ing.amount) * batches, ing.unit || product.unit);
          consumed += val;
        }
      });
    });
    return { purchased, consumed, stock: purchased - consumed, base };
  };

  const fetchRevisions = async () => {
    const { data } = await supabase.from("berrycake_revisions").select("*").order("revision_date", { ascending: false }).limit(20);
    if (data) setRevisions(data);
  };

  const saveRevision = async () => {
    setSavingRevision(true);
    const auth = JSON.parse(localStorage.getItem("bc_auth") || "{}");
    const items = products.map((p) => {
      const st = getProductStock(p);
      const expected = Math.max(0, st.stock);
      const actualRaw = parseFloat(revisionActuals[p.name] || "0");
      const { val: actualBase } = toBaseUnit(actualRaw, st.base);
      return { ingredient: p.name, unit: st.base, expected: Math.round(expected), actual: Math.round(actualBase), diff: Math.round(actualBase - expected) };
    });
    await supabase.from("berrycake_revisions").insert({
      revision_date: new Date().toISOString().slice(0, 10),
      items,
      conducted_by: auth.name || "—",
      notes: revisionNotes || null,
    });
    setShowRevisionForm(false);
    setRevisionActuals({});
    setRevisionNotes("");
    setSavingRevision(false);
    fetchRevisions();
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("berrycake_clients").select("*").order("name");
    if (data) setClients(data);
  };

  const saveClient = async () => {
    const payload = {
      name: clientForm.name,
      phone: clientForm.phone || null,
      price_per_unit: clientForm.price_per_unit ? parseFloat(clientForm.price_per_unit) : null,
      client_type: clientForm.client_type,
      notes: clientForm.notes || null,
    };
    if (editingClient) {
      await supabase.from("berrycake_clients").update(payload).eq("id", editingClient.id);
    } else {
      await supabase.from("berrycake_clients").insert(payload);
    }
    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" });
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    await supabase.from("berrycake_clients").delete().eq("id", id);
    fetchClients();
  };

  const openEditClient = (c: any) => {
    setEditingClient(c);
    setClientForm({ name: c.name, phone: c.phone || "", price_per_unit: c.price_per_unit?.toString() || "", client_type: c.client_type || "розница", notes: c.notes || "" });
    setShowClientModal(true);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("berrycake_users").select("id,name,role,pin").order("id");
    if (data) setUsers(data);
  };

  const saveUser = async () => {
    const payload = { name: userForm.name, role: userForm.role, pin: userForm.pin };
    if (editingUser) {
      await supabase.from("berrycake_users").update(payload).eq("id", editingUser.id);
    } else {
      await supabase.from("berrycake_users").insert(payload);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ name: "", role: "", pin: "" });
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    await supabase.from("berrycake_users").delete().eq("id", id);
    fetchUsers();
  };

  const fetchRecipes = async () => {
    const { data } = await supabase.from("berrycake_recipes").select("*").order("flavor");
    if (data) setRecipes(data);
  };

  const fetchProduction = async () => {
    const { data } = await supabase.from("berrycake_production").select("*").order("bake_date", { ascending: false }).limit(500);
    if (data) setProduction(data);
  };

  const saveRecipe = async () => {
    const payload = { flavor: recipeForm.flavor, yield_count: parseInt(recipeForm.yield_count) || 12, notes: recipeForm.notes || null, ingredients: recipeForm.ingredients };
    if (editingRecipe) {
      await supabase.from("berrycake_recipes").update(payload).eq("id", editingRecipe.id);
    } else {
      await supabase.from("berrycake_recipes").insert(payload);
    }
    setShowRecipeModal(false);
    setEditingRecipe(null);
    setRecipeForm({ flavor: "", yield_count: 12, notes: "", ingredients: [] });
    fetchRecipes();
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm("Удалить тех карту?")) return;
    await supabase.from("berrycake_recipes").delete().eq("id", id);
    fetchRecipes();
  };

  const openEditRecipe = (r: any) => {
    setEditingRecipe(r);
    setRecipeForm({ flavor: r.flavor, yield_count: r.yield_count, notes: r.notes || "", ingredients: r.ingredients || [] });
    setShowRecipeModal(true);
  };

  const addIngredientRow = () => setRecipeForm((f: any) => ({ ...f, ingredients: [...f.ingredients, { name: "", amount: "", unit: "г" }] }));
  const updateIngredient = (i: number, key: string, val: string) => setRecipeForm((f: any) => {
    const ing = [...f.ingredients]; ing[i] = { ...ing[i], [key]: val }; return { ...f, ingredients: ing };
  });
  const removeIngredient = (i: number) => setRecipeForm((f: any) => ({ ...f, ingredients: f.ingredients.filter((_: any, idx: number) => idx !== i) }));

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("berrycake_expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(300);
    if (data) setExpenses(data);
  };

  const addExpense = async () => {
    if (!expForm.description || !expForm.amount) return;
    setExpSaving(true);
    try {
      const payload: any = {
        description: expForm.description,
        category: expForm.category,
        amount: parseFloat(expForm.amount),
        expense_date: expForm.expense_date,
        payment_type: expForm.payment_type,
        confirmed_by: user?.name || null,
      };
      if (expForm.unit) payload.unit = expForm.unit;
      if (expForm.quantity_amount) payload.quantity_amount = parseFloat(expForm.quantity_amount);
      await supabase.from("berrycake_expenses").insert(payload);
      setExpForm({ description: "", category: "ингредиенты", unit: "", quantity_amount: "", payment_type: "нал", amount: "", expense_date: new Date().toISOString().slice(0,10) });
      fetchExpenses();
    } finally {
      setExpSaving(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    await supabase.from("berrycake_expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const getExpDescSuggestions = (val: string) => {
    if (!val.trim()) { setExpDescSuggestions([]); return; }
    const q = val.toLowerCase();
    const seen = new Set<string>();
    const suggestions: string[] = [];
    expenses.forEach((e) => {
      if (e.description && e.description.toLowerCase().includes(q) && !seen.has(e.description)) {
        seen.add(e.description);
        suggestions.push(e.description);
      }
    });
    setExpDescSuggestions(suggestions.slice(0, 6));
  };

  const syncExpenses = async () => {
    setExpenseSyncing(true);
    try {
      const res = await fetch("/api/sync-expenses", { method: "POST" });
      const data = await res.json();
      if (data.inserted > 0) fetchExpenses();
    } finally {
      setExpenseSyncing(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      const added = data.inserted ?? 0;
      setLastSync(`Синхронизировано: +${added} новых`);
      if (added > 0) fetchAll();
    } catch {
      setLastSync("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
    fetchAll();
    fetchExpenses();
    fetchClients();
    fetchUsers();
    fetchRecipes();
    fetchProduction();
    fetchRevisions();
    fetchProducts();

    const channel = supabase.channel("orders_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "berrycake_orders" }, (payload) => {
        const o = payload.new;
        setNotification(`🆕 Новый заказ: ${o.client_name || "—"} | ${o.cake_flavor || ""}`);
        setTimeout(() => setNotification(null), 5000);
        fetchAll();
      })
      .subscribe();

    const interval = setInterval(fetchAll, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const fetchAll = async () => {
    const { data: allOrders } = await supabase
      .from("berrycake_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!allOrders) return;
    setOrders(allOrders);
    setTotalOrders(allOrders.length);
    buildTopClients(allOrders);

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = allOrders.filter((o) => (o.order_date || o.created_at?.slice(0, 10)) === today);
    setTodayStats({
      orders: todayOrders.length,
      cakes: todayOrders.reduce((s, o) => s + (o.quantity || 1), 0),
    });

    // Daily stats from raw data (last 30 days)
    const dailyMap: Record<string, { order_date: string; orders: number; cakes: number }> = {};
    allOrders.forEach((o) => {
      const d = o.order_date || o.created_at?.slice(0, 10);
      if (!d) return;
      if (!dailyMap[d]) dailyMap[d] = { order_date: d, orders: 0, cakes: 0 };
      dailyMap[d].orders++;
      dailyMap[d].cakes += o.quantity || 1;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.order_date.localeCompare(b.order_date));
    setDailyStats(daily.map((r) => ({ ...r, day: r.order_date.slice(5) })));

    // Flavor stats from raw data
    const flavorMap: Record<string, number> = {};
    allOrders.forEach((o) => {
      const f = (o.cake_flavor || "").trim();
      if (!f) return;
      flavorMap[f] = (flavorMap[f] || 0) + (o.quantity || 1);
    });
    setFlavorStats(Object.entries(flavorMap).map(([flavor, count]) => ({ flavor, count })).sort((a, b) => b.count - a.count));
  };

  useEffect(() => {
    if (!addClientQuery.trim()) { setAddClientSuggestions([]); return; }
    const q = addClientQuery.toLowerCase();
    setAddClientSuggestions(clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone||"").includes(q)).slice(0, 6));
  }, [addClientQuery, clients]);

  const buildTopClients = (data) => {
    const map = {};
    data.forEach((o) => {
      const name = o.client_name || o.customer_name;
      if (!name) return;
      if (!map[name]) map[name] = { name, orders: 0, cakes: 0 };
      map[name].orders++;
      map[name].cakes += o.quantity || 1;
    });
    setTopClients((Object.values(map) as { name: string; orders: number; cakes: number }[]).sort((a, b) => b.cakes - a.cakes).slice(0, 10));
  };

  useEffect(() => {
    let res = [...orders];
    if (search) res = res.filter((o) => JSON.stringify(o).toLowerCase().includes(search.toLowerCase()));
    if (filterStatus !== "all") res = res.filter((o) => (o.status || "new") === filterStatus);
    if (filterDate) res = res.filter((o) => o.order_date === filterDate || o.created_at?.startsWith(filterDate));
    res.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    setFiltered(res);
  }, [orders, search, filterStatus, filterDate, sortField, sortDir]);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  const openEditOrder = (o: any) => {
    setEditingOrder(o);
    setOrderEditForm({
      client_name: o.client_name || "",
      phone: o.phone || "",
      cake_flavor: o.cake_flavor || "",
      quantity: o.quantity ?? "",
      order_date: o.order_date || "",
      order_time: o.order_time || "",
      address: o.address || "",
      notes: o.notes || "",
      status: o.status || "new",
      payment_type: o.payment_type || "",
      paid_amount: o.paid_amount ?? "",
      total_amount: o.total_amount ?? "",
    });
  };

  const saveOrderEdit = async () => {
    const payload = {
      ...orderEditForm,
      quantity: orderEditForm.quantity !== "" ? Number(orderEditForm.quantity) : null,
      paid_amount: orderEditForm.paid_amount !== "" ? Number(orderEditForm.paid_amount) : null,
      total_amount: orderEditForm.total_amount !== "" ? Number(orderEditForm.total_amount) : null,
    };
    await supabase.from("berrycake_orders").update(payload).eq("id", editingOrder.id);
    setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? { ...o, ...payload } : o));
    setEditingOrder(null);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Удалить заказ?")) return;
    await supabase.from("berrycake_orders").delete().eq("id", id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const exportCSV = () => {
    const cols = ["client_name", "phone", "cake_flavor", "quantity", "order_date", "order_time", "address", "status", "notes"];
    const header = ["Клиент", "Телефон", "Вкус", "Кол-во", "Дата", "Время", "Адрес", "Статус", "Заметки"].join(";");
    const rows = filtered.map((o) => cols.map((c) => `"${(o[c] ?? "").toString().replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `berrycake_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const runAI = async () => {
    setAiLoading(true); setAiResult("");
    try {
      const res = await fetch("/api/ai-analytics", { method: "POST" });
      const data = await res.json();
      setAiResult(data.analysis || data.error || "Ошибка");
    } finally { setAiLoading(false); }
  };

  const addOrder = async () => {
    const payload = {
      ...addForm,
      quantity: addForm.quantity ? Number(addForm.quantity) : null,
      total_amount: addForm.total_amount ? Number(addForm.total_amount) : null,
      status: "new",
    };
    await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setShowAddModal(false);
    setAddForm({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: new Date().toISOString().slice(0,10), order_time: "", address: "", notes: "", total_amount: "", payment_type: "" });
    setAddClientQuery("");
    fetchAll();
  };

  const approveCancellation = async (order: any) => {
    await supabase.from("berrycake_orders").update({ status: "cancelled" }).eq("id", order.id);
    fetchAll();
  };

  const rejectCancellation = async (order: any) => {
    await supabase.from("berrycake_orders").update({ status: order.previous_status || "new", cancellation_reason: null }).eq("id", order.id);
    fetchAll();
  };

  const sortBy = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  if (!user) return null;

  const s = { bg: "#f5f5f3", card: "#ffffff", gold: "#111827", text: "#111827", muted: "#6b7280", border: "#e5e7eb", sh: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)" };
  const font = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

  return (
    <div style={{ backgroundColor: s.bg, minHeight: "100vh", color: s.text, fontFamily: font }}>
      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 16, right: 16, backgroundColor: s.card, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", borderRadius: 10, padding: "12px 20px", zIndex: 1000, color: s.text, fontSize: 14, border: `1px solid ${s.border}` }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: s.card, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: isMobile ? "12px 16px" : "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🍰</span>
          <span style={{ color: s.gold, fontWeight: 700, fontSize: isMobile ? 15 : 17, letterSpacing: "-0.3px" }}>BerryCake</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isMobile && lastSync && <span style={{ color: s.muted, fontSize: 12 }}>{lastSync}</span>}
          <button onClick={syncNow} disabled={syncing}
            style={{ background: s.gold, border: "none", color: "#ffffff", padding: isMobile ? "6px 12px" : "7px 16px", borderRadius: 8, cursor: syncing ? "default" : "pointer", fontSize: isMobile ? 12 : 13, fontWeight: 600, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? "..." : "Обновить"}
          </button>
          {!isMobile && <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>}
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: isMobile ? 12 : 13 }}>
            Выйти
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: s.card, display: "flex", gap: 0, padding: isMobile ? "0 8px" : "0 28px", borderBottom: `1px solid ${s.border}`, overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: "none", border: "none", color: tab === i ? s.gold : s.muted, fontWeight: tab === i ? 600 : 400,
            fontSize: isMobile ? 12 : 13, padding: isMobile ? "11px 10px" : "12px 16px", cursor: "pointer",
            borderBottom: tab === i ? `2px solid ${s.gold}` : "2px solid transparent",
            transition: "color 0.15s", whiteSpace: "nowrap", flexShrink: 0,
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: isMobile ? "16px 12px" : "24px 28px" }}>
        {/* ── TAB 0: Обзор ── */}
        {tab === 0 && (() => {
          const prevMonth = () => {
            const [y, m] = selectedMonth.split("-").map(Number);
            const d = new Date(y, m - 2, 1);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const nextMonth = () => {
            const [y, m] = selectedMonth.split("-").map(Number);
            const d = new Date(y, m, 1);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const monthLabel = new Date(selectedMonth + "-01").toLocaleString("ru-RU", { month: "long", year: "numeric" });
          const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

          const mOrders = orders.filter((o) => {
            const d = o.order_date || o.created_at?.slice(0, 10);
            return d?.startsWith(selectedMonth);
          });
          const mCakes = mOrders.reduce((s, o) => s + (o.quantity || 1), 0);

          const mDailyMap: Record<string, { day: string; orders: number; cakes: number }> = {};
          mOrders.forEach((o) => {
            const d = (o.order_date || o.created_at?.slice(0, 10)) || "";
            const day = d.slice(5);
            if (!mDailyMap[d]) mDailyMap[d] = { day, orders: 0, cakes: 0 };
            mDailyMap[d].orders++;
            mDailyMap[d].cakes += o.quantity || 1;
          });
          const mDaily = Object.values(mDailyMap).sort((a, b) => a.day.localeCompare(b.day));

          const mFlavorMap: Record<string, number> = {};
          mOrders.forEach((o) => {
            const f = (o.cake_flavor || "").trim();
            if (!f) return;
            mFlavorMap[f] = (mFlavorMap[f] || 0) + (o.quantity || 1);
          });
          const mFlavors = Object.entries(mFlavorMap).map(([flavor, count]) => ({ flavor, count })).sort((a, b) => b.count - a.count);

          return (
            <>
              {/* Month navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 28 }}>
                <button onClick={prevMonth}
                  style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
                  ‹
                </button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: s.gold, fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{monthLabel}</div>
                  {isCurrentMonth && <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>текущий месяц</div>}
                </div>
                <button onClick={nextMonth} disabled={isCurrentMonth}
                  style={{ background: "none", border: `1px solid ${isCurrentMonth ? s.bg : s.border}`, color: isCurrentMonth ? s.bg : s.muted, borderRadius: 8, padding: "6px 16px", cursor: isCurrentMonth ? "default" : "pointer", fontSize: 20, lineHeight: 1 }}>
                  ›
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom: 32 }}>
                {[
                  ["Заказов за месяц", mOrders.length],
                  ["Тортов за месяц", mCakes],
                  ["Заказов сегодня", todayStats.orders],
                  ["Тортов сегодня", todayStats.cakes],
                ].map(([label, val]) => (
                  <div key={label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh, borderLeft: "3px solid #111827" }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 8 }}>{label}</div>
                    <div style={{ color: s.gold, fontSize: 32, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: s.sh }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Заказы по дням — {monthLabel}</h2>
                {mDaily.length === 0
                  ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Нет заказов в этом месяце</div>
                  : <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mDaily}>
                        <XAxis dataKey="day" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                        <YAxis stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} labelStyle={{ color: s.gold }} itemStyle={{ color: s.text }} />
                        <Bar dataKey="orders" fill={s.gold} radius={[4,4,0,0]} name="Заказы" />
                        <Bar dataKey="cakes" fill="#64b5f6" radius={[4,4,0,0]} name="Торты" />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24 }}>
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                  <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Топ вкусов — {monthLabel}</h2>
                  {mFlavors.length === 0
                    ? <div style={{ color: s.muted, fontSize: 13 }}>Нет данных</div>
                    : mFlavors.slice(0, 8).map((f) => (
                        <div key={f.flavor} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: s.text }}>{f.flavor}</span>
                            <span style={{ color: s.gold }}>{f.count} шт</span>
                          </div>
                          <div style={{ backgroundColor: s.border, borderRadius: 4, height: 6 }}>
                            <div style={{ backgroundColor: s.gold, height: 6, borderRadius: 4, width: `${(f.count / (mFlavors[0]?.count || 1)) * 100}%` }} />
                          </div>
                        </div>
                      ))
                  }
                </div>

                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                  <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Заказы месяца</h2>
                  <div style={{ overflowY: "auto", maxHeight: 280 }}>
                    {mOrders.length === 0
                      ? <div style={{ color: s.muted, fontSize: 13 }}>Нет заказов</div>
                      : mOrders.slice(0, 15).map((o) => (
                          <div key={o.id} style={{ borderBottom: `1px solid ${s.border}`, paddingBottom: 10, marginBottom: 10, fontSize: 13 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: s.gold, fontWeight: 600 }}>{o.client_name || o.customer_name || "—"}</span>
                              <span style={{ fontSize: 11, color: s.muted }}>{o.order_date || o.created_at?.slice(0,10)}</span>
                            </div>
                            <div style={{ color: "#aaa", marginTop: 2 }}>
                              {o.cake_flavor || ""}{o.quantity ? ` · ${o.quantity} шт` : ""}
                              <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 10, fontSize: 11, backgroundColor: `${(STATUSES[o.status || "new"] || STATUSES.new).color}22`, color: (STATUSES[o.status || "new"] || STATUSES.new).color }}>
                                {(STATUSES[o.status || "new"] || STATUSES.new).label}
                              </span>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* ── TAB 1: Заказы ── */}
        {tab === 1 && (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="🔍 Поиск..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 180, backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, outline: "none" }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, cursor: "pointer" }}>
                <option value="all">Все статусы</option>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDate(""); }}
                style={{ backgroundColor: s.border, border: "none", borderRadius: 8, padding: "8px 14px", color: s.muted, cursor: "pointer", fontSize: 13 }}>
                Сброс
              </button>
              <button onClick={exportCSV}
                style={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8, padding: "8px 14px", color: s.gold, cursor: "pointer", fontSize: 13 }}>
                ↓ Excel
              </button>
              <button onClick={() => setShowAddModal(true)}
                style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "8px 16px", color: "#ffffff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                + Заказ
              </button>
            </div>

            <div style={{ color: s.muted, fontSize: 13, marginBottom: 12 }}>Найдено: {filtered.length}</div>

            {/* Table */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                      {[["client_name","Клиент"],["cake_flavor","Вкус"],["quantity","Кол-во"],["order_date","Дата"],["order_time","Время"],["address","Адрес"],["phone","Телефон"],["status","Статус"]].map(([f,l]) => (
                        <th key={f} onClick={() => sortBy(f)} style={{ padding: "12px 14px", textAlign: "left", color: s.muted, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                          {l}{sortField === f ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      ))}
                      <th style={{ padding: "12px 14px", color: s.muted, fontWeight: 600 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((o) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 600 }}>{o.client_name || o.customer_name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.cake_flavor || o.flavor || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{o.quantity ?? "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.order_date || o.created_at?.slice(0,10) || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.order_time || "—"}</td>
                        <td style={{ padding: "10px 14px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.address || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.phone || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <select value={o.status || "new"} onChange={(e) => updateStatus(o.id, e.target.value)}
                            style={{ backgroundColor: `${(STATUSES[o.status || "new"] || STATUSES.new).color}22`, border: `1px solid ${(STATUSES[o.status || "new"] || STATUSES.new).color}`, borderRadius: 6, padding: "3px 8px", color: (STATUSES[o.status || "new"] || STATUSES.new).color, fontSize: 12, cursor: "pointer" }}>
                            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <button onClick={() => openEditOrder(o)}
                            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, marginRight: 6 }}>
                            ✏️
                          </button>
                          <button onClick={() => deleteOrder(o.id)}
                            style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── TAB 2: Клиенты ── */}
        {tab === 2 && (() => {
          const totalDebt = clients.reduce((sum, c) => {
            const orders = filtered.filter((o) => o.client_name === c.name || o.phone === c.phone);
            const debt = orders.reduce((s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)), 0);
            return sum + debt;
          }, 0);
          return (
          <>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Клиентов", val: clients.length },
                { label: "Консигнация", val: clients.filter((c) => c.client_type === "консигнация").length },
                { label: "Общий долг", val: totalDebt > 0 ? `${totalDebt.toLocaleString()} ₸` : "0 ₸" },
              ].map((st) => (
                <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                  <div style={{ color: s.muted, fontSize: 12, marginBottom: 6 }}>{st.label}</div>
                  <div style={{ color: s.gold, fontSize: 22, fontWeight: 700 }}>{st.val}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: s.gold, fontSize: 15, margin: 0 }}>Клиенты и ставки</h2>
                <button onClick={() => { setEditingClient(null); setClientForm({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" }); setShowClientModal(true); }}
                  style={{ background: s.gold, border: "none", color: "#ffffff", padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  + Добавить клиента
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    {["Клиент","Телефон","Тип","Ставка (₸/шт)","Долг","Заметки",""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: s.muted }}>Нет клиентов. Добавьте первого.</td></tr>
                  )}
                  {clients.map((c) => {
                    const clientOrders = orders.filter((o) => o.client_name === c.name || (c.phone && o.phone === c.phone));
                    const debt = clientOrders.reduce((s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)), 0);
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "10px 14px", color: s.muted }}>{c.phone || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: c.client_type === "консигнация" ? "#7c3aed22" : c.client_type === "опт" ? "#c8a96e22" : "#1a1815", color: c.client_type === "консигнация" ? "#a78bfa" : c.client_type === "опт" ? s.gold : s.muted, padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>
                            {c.client_type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 700 }}>
                          {c.price_per_unit ? `${Number(c.price_per_unit).toLocaleString()} ₸` : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: debt > 0 ? "#f87171" : s.muted, fontWeight: debt > 0 ? 700 : 400 }}>
                          {debt > 0 ? `${debt.toLocaleString()} ₸` : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>{c.notes || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => openEditClient(c)} style={{ background: "none", border: `1px solid ${s.border}`, color: s.text, padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                            <button onClick={() => { if (confirm("Удалить клиента?")) deleteClient(c.id); }} style={{ background: "none", border: `1px solid ${s.border}`, color: "#f87171", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Client modal */}
            {showClientModal && (
              <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                <div style={{ background: s.card, borderRadius: 16, padding: 28, width: 420, border: `1px solid ${s.border}` }}>
                  <h3 style={{ color: s.gold, marginBottom: 20 }}>{editingClient ? "Редактировать клиента" : "Добавить клиента"}</h3>
                  {[
                    { label: "Имя / название *", key: "name", type: "text" },
                    { label: "Телефон", key: "phone", type: "text" },
                    { label: "Ставка за 1 шт (₸)", key: "price_per_unit", type: "number" },
                    { label: "Заметки", key: "notes", type: "text" },
                  ].map(({ label, key, type }) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ color: s.muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
                      <input type={type} value={clientForm[key]} onChange={(e) => setClientForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={{ width: "100%", background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: "8px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 4 }}>Тип клиента</div>
                    <select value={clientForm.client_type} onChange={(e) => setClientForm((f) => ({ ...f, client_type: e.target.value }))}
                      style={{ width: "100%", background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
                      <option>розница</option>
                      <option>опт</option>
                      <option>консигнация</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowClientModal(false)} style={{ flex: 1, background: "none", border: `1px solid ${s.border}`, color: s.text, padding: "9px 0", borderRadius: 8, cursor: "pointer" }}>Отмена</button>
                    <button onClick={saveClient} disabled={!clientForm.name}
                      style={{ flex: 2, background: clientForm.name ? s.gold : s.border, color: clientForm.name ? "#ffffff" : s.muted, border: "none", padding: "9px 0", borderRadius: 8, cursor: clientForm.name ? "pointer" : "default", fontWeight: 700 }}>
                      {editingClient ? "Сохранить" : "Добавить"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
          );
        })()}

        {/* ── TAB 3: Расходы ── */}
        {tab === 3 && (() => {
          const EXPENSE_CATS = ["ингредиенты","упаковка","зарплата","аренда","доставка","реклама","оборудование","обед","налоги","прочее"];
          const UNITS = ["кг","г","л","шт","уп"];
          const PAY_TYPES = ["нал","каспи","со счёта ИП"];
          const PIE_COLORS = ["#c8a96e","#64b5f6","#81c784","#e57373","#f06292","#ffb74d","#a78bfa","#4dd0e1","#aed581","#ff8a65"];

          const prevExpMonth = () => {
            const [y, m] = expenseMonth.split("-").map(Number);
            const d = new Date(y, m - 2, 1);
            setExpenseMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const nextExpMonth = () => {
            const [y, m] = expenseMonth.split("-").map(Number);
            const d = new Date(y, m, 1);
            setExpenseMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const isCurrentExpMonth = expenseMonth === new Date().toISOString().slice(0, 7);
          const expMonthLabel = new Date(expenseMonth + "-01").toLocaleString("ru-RU", { month: "long", year: "numeric" });

          const monthExpenses = expenses.filter((e) => e.expense_date?.startsWith(expenseMonth));
          const filteredExpenses = monthExpenses.filter((e) => expenseFilter === "all" || e.category === expenseFilter);
          const monthTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

          const byCategory = EXPENSE_CATS.map((cat) => ({
            name: cat, value: monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0)
          })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

          const byDay: Record<string, number> = {};
          monthExpenses.forEach((e) => {
            const d = e.expense_date || "";
            byDay[d] = (byDay[d] || 0) + (e.amount || 0);
          });
          const dailyData = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b)).map(([date, sum]) => ({ day: date.slice(8), sum }));

          const avgDay = dailyData.length > 0 ? Math.round(monthTotal / dailyData.length) : 0;

          const canAddExpense = ["Дархан","Айдын","Алиби"].includes(user?.name);

          return (
            <div>
              {/* Month navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 }}>
                <button onClick={prevExpMonth} style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>‹</button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: s.gold, fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{expMonthLabel}</div>
                  {isCurrentExpMonth && <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>текущий месяц</div>}
                </div>
                <button onClick={nextExpMonth} disabled={isCurrentExpMonth}
                  style={{ background: "none", border: `1px solid ${isCurrentExpMonth ? s.bg : s.border}`, color: isCurrentExpMonth ? s.bg : s.muted, borderRadius: 8, padding: "6px 16px", cursor: isCurrentExpMonth ? "default" : "pointer", fontSize: 20, lineHeight: 1 }}>›</button>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
                {[
                  { label: "Итого за месяц", val: `${monthTotal.toLocaleString("ru-RU")} ₸`, color: "#e57373" },
                  { label: "Записей", val: monthExpenses.length, color: s.text },
                  { label: "Среднедневной", val: avgDay > 0 ? `${avgDay.toLocaleString("ru-RU")} ₸` : "—", color: s.gold },
                ].map((st) => (
                  <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${st.color}` }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 6 }}>{st.label}</div>
                    <div style={{ color: st.color, fontSize: 24, fontWeight: 700 }}>{st.val}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              {monthTotal > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.6fr", gap: 20, marginBottom: 24 }}>
                  {/* Donut chart */}
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                    <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>По категориям</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <PieChart width={140} height={140}>
                        <Pie data={byCategory} cx={65} cy={65} innerRadius={38} outerRadius={62} dataKey="value" strokeWidth={0}>
                          {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                      <div style={{ flex: 1 }}>
                        {byCategory.map((c, i) => (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 11, color: s.text }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: s.muted, fontWeight: 600 }}>{Math.round(c.value / monthTotal * 100)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Daily bar chart */}
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                    <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>Расходы по дням</h3>
                    {dailyData.length > 0
                      ? <ResponsiveContainer width="100%" height={130}>
                          <BarChart data={dailyData}>
                            <XAxis dataKey="day" stroke={s.muted} tick={{ fill: s.muted, fontSize: 10 }} />
                            <YAxis stroke={s.muted} tick={{ fill: s.muted, fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
                            <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} formatter={(v: any) => [`${v.toLocaleString("ru-RU")} ₸`, "Сумма"]} />
                            <Bar dataKey="sum" fill="#e57373" radius={[3,3,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      : <div style={{ color: s.muted, fontSize: 13, textAlign: "center", paddingTop: 40 }}>Нет данных</div>
                    }
                  </div>
                </div>
              )}

              {/* Add expense form — only for Дархан/Айдын/Алиби */}
              {canAddExpense && (
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 24, border: `1px solid ${s.border}` }}>
                  <h3 style={{ color: s.gold, fontSize: 14, marginBottom: isMobile ? 14 : 18 }}>Добавить расход</h3>

                  {isMobile ? (
                    /* ── MOBILE FORM ── */
                    <div>
                      {/* Category chips */}
                      <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Категория</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, marginBottom: 16 }}>
                        {[
                          { k: "ингредиенты", e: "🌾" }, { k: "упаковка", e: "📦" }, { k: "зарплата", e: "💰" },
                          { k: "аренда", e: "🏠" }, { k: "доставка", e: "🚚" }, { k: "реклама", e: "📢" },
                          { k: "оборудование", e: "🔧" }, { k: "обед", e: "🍱" }, { k: "налоги", e: "🧾" }, { k: "прочее", e: "📌" },
                        ].map(({ k, e }) => (
                          <button key={k} onClick={() => setExpForm((f) => ({ ...f, category: k, unit: "" }))}
                            style={{
                              padding: "10px 4px", borderRadius: 10, border: `2px solid ${expForm.category === k ? s.gold : s.border}`,
                              background: expForm.category === k ? "#11182710" : "none", cursor: "pointer",
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                            }}>
                            <span style={{ fontSize: 18 }}>{e}</span>
                            <span style={{ fontSize: 9, color: expForm.category === k ? s.gold : s.muted, fontWeight: expForm.category === k ? 700 : 400, lineHeight: 1.2, textAlign: "center" }}>{k}</span>
                          </button>
                        ))}
                      </div>

                      {/* Qty + unit (if needed) */}
                      {(expForm.category === "ингредиенты" || expForm.category === "упаковка") && (
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Кол-во</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input type="number" inputMode="decimal" placeholder="25"
                              value={expForm.quantity_amount}
                              onChange={(e) => setExpForm((f) => ({ ...f, quantity_amount: e.target.value }))}
                              style={{ width: 90, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px", color: s.text, fontSize: 16, outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 6, flex: 1 }}>
                              {UNITS.map((u) => (
                                <button key={u} onClick={() => setExpForm((f) => ({ ...f, unit: u }))}
                                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${expForm.unit === u ? s.gold : s.border}`, background: expForm.unit === u ? s.gold + "22" : "none", color: expForm.unit === u ? s.gold : s.muted, fontSize: 13, cursor: "pointer", fontWeight: expForm.unit === u ? 700 : 400 }}>
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <div style={{ marginBottom: 14, position: "relative" }}>
                        <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Описание *</label>
                        <input
                          value={expForm.description}
                          onChange={(e) => { setExpForm((f) => ({ ...f, description: e.target.value })); getExpDescSuggestions(e.target.value); }}
                          onBlur={() => setTimeout(() => setExpDescSuggestions([]), 150)}
                          placeholder="мука, масло, зарплата..."
                          style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "13px 12px", color: s.text, fontSize: 16, outline: "none", boxSizing: "border-box" }}
                        />
                        {expDescSuggestions.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, zIndex: 20, overflow: "hidden", marginTop: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                            {expDescSuggestions.map((d) => (
                              <div key={d} onClick={() => { setExpForm((f) => ({ ...f, description: d })); setExpDescSuggestions([]); }}
                                style={{ padding: "12px 14px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${s.border}`, color: s.text }}>
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Amount — big */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Сумма ₸ *</label>
                        <input
                          type="number" inputMode="numeric" placeholder="0"
                          value={expForm.amount}
                          onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                          style={{ width: "100%", backgroundColor: s.bg, border: `2px solid ${expForm.amount ? s.gold : s.border}`, borderRadius: 12, padding: "14px 16px", color: s.text, fontSize: 32, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      {/* Date */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Дата</label>
                        <input type="date" value={expForm.expense_date}
                          onChange={(e) => setExpForm((f) => ({ ...f, expense_date: e.target.value }))}
                          style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "13px 12px", color: s.text, fontSize: 16, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      {/* Payment type — big buttons */}
                      <div style={{ marginBottom: 18 }}>
                        <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Тип оплаты</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {PAY_TYPES.map((pt) => (
                            <button key={pt} onClick={() => setExpForm((f) => ({ ...f, payment_type: pt }))}
                              style={{ flex: 1, padding: "14px 8px", borderRadius: 10, border: `2px solid ${expForm.payment_type === pt ? s.gold : s.border}`, background: expForm.payment_type === pt ? "#11182710" : "none", color: expForm.payment_type === pt ? s.gold : s.muted, fontSize: 13, cursor: "pointer", fontWeight: expForm.payment_type === pt ? 700 : 400 }}>
                              {pt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={addExpense} disabled={expSaving || !expForm.description || !expForm.amount}
                        style={{ width: "100%", backgroundColor: (expSaving || !expForm.description || !expForm.amount) ? s.border : s.gold, border: "none", borderRadius: 12, padding: "16px", color: (expSaving || !expForm.description || !expForm.amount) ? s.muted : "#ffffff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                        {expSaving ? "Сохранение..." : "✓ Добавить расход"}
                      </button>
                    </div>
                  ) : (
                    /* ── DESKTOP FORM ── */
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        {/* Description with autocomplete */}
                        <div style={{ gridColumn: "1 / -1", position: "relative" }}>
                          <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Описание *</label>
                          <input
                            value={expForm.description}
                            onChange={(e) => { setExpForm((f) => ({ ...f, description: e.target.value })); getExpDescSuggestions(e.target.value); }}
                            onBlur={() => setTimeout(() => setExpDescSuggestions([]), 150)}
                            placeholder="Например: мука, масло 82%, зарплата за июль..."
                            style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                          />
                          {expDescSuggestions.length > 0 && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#222", border: `1px solid ${s.border}`, borderRadius: 8, zIndex: 20, overflow: "hidden", marginTop: 2 }}>
                              {expDescSuggestions.map((d) => (
                                <div key={d} onClick={() => { setExpForm((f) => ({ ...f, description: d })); setExpDescSuggestions([]); }}
                                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${s.border}` }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = s.card}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                                  {d}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Category */}
                        <div>
                          <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Категория</label>
                          <select value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value, unit: "" }))}
                            style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13 }}>
                            {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>

                        {/* Unit — show if ингредиенты or упаковка */}
                        {(expForm.category === "ингредиенты" || expForm.category === "упаковка") ? (
                          <div>
                            <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Кол-во + ед. измерения</label>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                type="number" placeholder="25"
                                value={expForm.quantity_amount}
                                onChange={(e) => setExpForm((f) => ({ ...f, quantity_amount: e.target.value }))}
                                style={{ width: 80, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 10px", color: s.text, fontSize: 13, outline: "none" }}
                              />
                              <select value={expForm.unit} onChange={(e) => setExpForm((f) => ({ ...f, unit: e.target.value }))}
                                style={{ flex: 1, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 10px", color: s.text, fontSize: 13 }}>
                                <option value="">— ед.</option>
                                {UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : <div />}

                        {/* Amount */}
                        <div>
                          <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Сумма (₸) *</label>
                          <input
                            type="number" placeholder="15000"
                            value={expForm.amount}
                            onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                            style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>

                        {/* Date */}
                        <div>
                          <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Дата</label>
                          <input
                            type="date" value={expForm.expense_date}
                            onChange={(e) => setExpForm((f) => ({ ...f, expense_date: e.target.value }))}
                            style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>

                      {/* Payment type */}
                      <div style={{ marginTop: 14 }}>
                        <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Тип оплаты</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {PAY_TYPES.map((pt) => (
                            <button key={pt} onClick={() => setExpForm((f) => ({ ...f, payment_type: pt }))}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${expForm.payment_type === pt ? s.gold : s.border}`, background: expForm.payment_type === pt ? s.gold + "22" : "none", color: expForm.payment_type === pt ? s.gold : s.muted, fontSize: 13, cursor: "pointer", fontWeight: expForm.payment_type === pt ? 700 : 400 }}>
                              {pt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={addExpense} disabled={expSaving || !expForm.description || !expForm.amount}
                        style={{ marginTop: 18, width: "100%", backgroundColor: (expSaving || !expForm.description || !expForm.amount) ? s.border : s.gold, border: "none", borderRadius: 8, padding: "11px", color: (expSaving || !expForm.description || !expForm.amount) ? s.muted : "#ffffff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        {expSaving ? "Сохранение..." : "Добавить расход"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Filter by category */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {["all", ...EXPENSE_CATS].map((c) => (
                  <button key={c} onClick={() => setExpenseFilter(c)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${expenseFilter === c ? s.gold : s.border}`, background: expenseFilter === c ? s.gold + "22" : "none", color: expenseFilter === c ? s.gold : s.muted, fontSize: 12, cursor: "pointer" }}>
                    {c === "all" ? "Все" : c}
                  </button>
                ))}
              </div>

              {/* Expenses list */}
              {isMobile ? (
                <div>
                  {filteredExpenses.length === 0 && (
                    <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 32, textAlign: "center", color: s.muted, fontSize: 13 }}>Нет расходов за {expMonthLabel}</div>
                  )}
                  {filteredExpenses.map((e) => (
                    <div key={e.id} style={{ backgroundColor: s.card, borderRadius: 12, padding: "14px 16px", marginBottom: 10, boxShadow: s.sh }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                          <div style={{ color: s.text, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</div>
                          <div style={{ color: s.muted, fontSize: 12, marginTop: 2 }}>
                            {e.expense_date || "—"} · {e.payment_type || "—"}
                            {e.quantity_amount ? ` · ${e.quantity_amount} ${e.unit || ""}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ color: "#e57373", fontWeight: 700, fontSize: 16 }}>{e.amount ? `${Number(e.amount).toLocaleString("ru-RU")} ₸` : "—"}</span>
                          {canAddExpense && (
                            <button onClick={() => deleteExpense(e.id)}
                              style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>✕</button>
                          )}
                        </div>
                      </div>
                      <span style={{ background: "#f0f0ee", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: s.muted }}>{e.category || "прочее"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ backgroundColor: s.card, borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                        {["Дата","Категория","Описание","Кол-во","Тип оплаты","Сумма","Кто",""].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: s.muted }}>Нет расходов за {expMonthLabel}</td></tr>
                      )}
                      {filteredExpenses.map((e) => (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                          <td style={{ padding: "10px 14px", color: s.muted, whiteSpace: "nowrap" }}>{e.expense_date || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ background: "#f0f0ee", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>{e.category || "прочее"}</span>
                          </td>
                          <td style={{ padding: "10px 14px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</td>
                          <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>
                            {e.quantity_amount ? `${e.quantity_amount} ${e.unit || ""}` : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>{e.payment_type || "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#e57373", fontWeight: 700 }}>{e.amount ? `${Number(e.amount).toLocaleString("ru-RU")} ₸` : "—"}</td>
                          <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>{e.confirmed_by || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {canAddExpense && (
                              <button onClick={() => deleteExpense(e.id)}
                                style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Cancellation requests banner (visible on all tabs for approvers) ── */}
        {CANCEL_APPROVERS.includes(user?.name) && (() => {
          const pending = orders.filter((o) => o.status === "cancellation_requested");
          if (!pending.length) return null;
          return (
            <div style={{ backgroundColor:"#1a1200", border:"1px solid #ff980066", borderRadius:12, padding:16, marginBottom:24 }}>
              <div style={{ color:"#ff9800", fontWeight:700, fontSize:14, marginBottom:12 }}>⚠️ Запросы на отмену заказов ({pending.length})</div>
              {pending.map((o)=>(
                <div key={o.id} style={{ backgroundColor:"#ffffff", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div>
                    <div style={{ color:s.text, fontWeight:600, fontSize:14 }}>{o.client_name||"—"} · {o.cake_flavor||"—"} · {o.quantity||"—"} шт</div>
                    <div style={{ color:s.muted, fontSize:12, marginTop:4 }}>Дата: {o.order_date||"—"}</div>
                    <div style={{ color:"#ff9800", fontSize:13, marginTop:4 }}>Причина: «{o.cancellation_reason}»</div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>approveCancellation(o)}
                      style={{ backgroundColor:"#e5737322", border:"1px solid #e57373", color:"#e57373", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                      Подтвердить
                    </button>
                    <button onClick={()=>rejectCancellation(o)}
                      style={{ backgroundColor:"#4caf5022", border:"1px solid #4caf50", color:"#81c784", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── TAB 6: Настройки ── */}
        {tab === 6 && (
          <div style={{ maxWidth: 720 }}>
            {/* Профиль */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 20 }}>Профиль</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: s.bg, border: `2px solid ${s.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                  {user?.name?.[0] || "?"}
                </div>
                <div>
                  <div style={{ color: s.text, fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                  <div style={{ color: s.muted, fontSize: 13, marginTop: 2 }}>{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Пользователи */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, margin: 0 }}>Пользователи</h2>
                <button onClick={() => { setEditingUser(null); setUserForm({ name: "", role: "", pin: "" }); setShowUserModal(true); }}
                  style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "7px 16px", color: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  + Добавить
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    {["Имя", "Должность", "PIN", ""].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", color: s.muted, fontSize: 12, textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                      <td style={{ padding: "12px 12px", fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: "12px 12px", color: s.muted, fontSize: 13 }}>{u.role}</td>
                      <td style={{ padding: "12px 12px", fontFamily: "monospace", color: s.muted, fontSize: 13, letterSpacing: 2 }}>
                        {"•".repeat(u.pin?.length || 6)}
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, role: u.role, pin: u.pin }); setShowUserModal(true); }}
                          style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginRight: 8 }}>
                          Ред.
                        </button>
                        {users.length > 1 && (
                          <button onClick={() => deleteUser(u.id)}
                            style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: Производство ── */}
        {tab === 4 && (() => {
          const PROD_SUB_TABS = ["Обзор цеха", "Тех карты", "Склад", "Ревизия"];

          const prevProdMonth = () => {
            const [y, m] = prodMonth.split("-").map(Number);
            const d = new Date(y, m - 2, 1);
            setProdMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const nextProdMonth = () => {
            const [y, m] = prodMonth.split("-").map(Number);
            const d = new Date(y, m, 1);
            setProdMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const isCurrentProdMonth = prodMonth === new Date().toISOString().slice(0, 7);
          const prodMonthLabel = new Date(prodMonth + "-01").toLocaleString("ru-RU", { month: "long", year: "numeric" });

          const monthProd = production.filter((r) => r.bake_date?.startsWith(prodMonth));
          const today = new Date().toISOString().slice(0, 10);
          const todayProd = production.filter((r) => r.bake_date === today);

          const totalBaked = monthProd.reduce((s, r) => s + (r.quantity || 0), 0);
          const totalDefects = monthProd.reduce((s, r) => s + (r.defects || 0), 0);
          const totalGood = totalBaked - totalDefects;
          const defectRate = totalBaked > 0 ? ((totalDefects / totalBaked) * 100).toFixed(1) : "0";

          const byFlavor: Record<string, { qty: number; defects: number }> = {};
          monthProd.forEach((r) => {
            if (!byFlavor[r.flavor]) byFlavor[r.flavor] = { qty: 0, defects: 0 };
            byFlavor[r.flavor].qty += r.quantity || 0;
            byFlavor[r.flavor].defects += r.defects || 0;
          });

          const byDay: Record<string, number> = {};
          monthProd.forEach((r) => { byDay[r.bake_date] = (byDay[r.bake_date] || 0) + (r.quantity || 0); });
          const dailyProdData = Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b)).map(([date, qty]) => ({ day: date.slice(8), qty }));

          const calcCost = (recipe: any) => {
            if (!recipe?.ingredients?.length) return null;
            let total = 0;
            for (const ing of recipe.ingredients) {
              const matches = expenses.filter((e) => e.category === "ингредиенты" && e.description?.toLowerCase().includes(ing.name.toLowerCase()) && e.unit && e.quantity_amount);
              if (!matches.length) continue;
              const latest = matches.sort((a: any, b: any) => b.expense_date?.localeCompare(a.expense_date))[0];
              const { val: ingBase } = toBaseUnit(parseFloat(ing.amount || "0"), ing.unit || "г");
              const { val: expBase } = toBaseUnit(parseFloat(latest.quantity_amount), latest.unit || "г");
              const unitCost = expBase > 0 ? (latest.amount || 0) / expBase : 0;
              total += unitCost * ingBase;
            }
            return { total, perUnit: recipe.yield_count > 0 ? total / recipe.yield_count : total };
          };

          // Revision data
          const stock = calcExpectedStock();
          const shoppingList = calcShoppingList(stock);
          const stockEntries = Object.entries(stock);

          return (
            <div>
              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${s.border}`, paddingBottom: 0 }}>
                {PROD_SUB_TABS.map((t, i) => (
                  <button key={i} onClick={() => setProdSubTab(i)} style={{
                    background: "none", border: "none", color: prodSubTab === i ? s.gold : s.muted,
                    fontWeight: prodSubTab === i ? 700 : 400, fontSize: 14,
                    padding: "8px 20px", cursor: "pointer",
                    borderBottom: prodSubTab === i ? `2px solid ${s.gold}` : "2px solid transparent",
                  }}>{t}</button>
                ))}
              </div>

              {/* ── SUB 0: Обзор цеха ── */}
              {prodSubTab === 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 }}>
                    <button onClick={prevProdMonth} style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 20 }}>‹</button>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: s.gold, fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{prodMonthLabel}</div>
                      {isCurrentProdMonth && <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>текущий месяц</div>}
                    </div>
                    <button onClick={nextProdMonth} disabled={isCurrentProdMonth}
                      style={{ background: "none", border: `1px solid ${isCurrentProdMonth ? s.bg : s.border}`, color: isCurrentProdMonth ? s.bg : s.muted, borderRadius: 8, padding: "6px 16px", cursor: isCurrentProdMonth ? "default" : "pointer", fontSize: 20 }}>›</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
                    {[
                      { label: "Выпечено за месяц", val: totalBaked, color: s.gold },
                      { label: "Годных", val: totalGood, color: "#81c784" },
                      { label: "Брак", val: totalDefects, color: "#e57373" },
                      { label: "% брака", val: `${defectRate}%`, color: totalDefects > 0 ? "#ff9800" : s.muted },
                    ].map((st) => (
                      <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${st.color}` }}>
                        <div style={{ color: s.muted, fontSize: 12, marginBottom: 6 }}>{st.label}</div>
                        <div style={{ color: st.color, fontSize: 26, fontWeight: 700 }}>{st.val}</div>
                      </div>
                    ))}
                  </div>

                  {totalBaked > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, marginBottom: 28 }}>
                      <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                        <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>По вкусам</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <PieChart width={130} height={130}>
                            <Pie data={Object.entries(byFlavor).map(([name, v]) => ({ name, value: v.qty }))} cx={60} cy={60} innerRadius={35} outerRadius={58} dataKey="value" strokeWidth={0}>
                              {Object.keys(byFlavor).map((f, i) => <Cell key={f} fill={PIE_COLORS_PROD[i % PIE_COLORS_PROD.length]} />)}
                            </Pie>
                          </PieChart>
                          <div style={{ flex: 1 }}>
                            {Object.entries(byFlavor).map(([f, v], i) => (
                              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: PIE_COLORS_PROD[i % PIE_COLORS_PROD.length], flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 11, color: s.text }}>{f}</div>
                                <div style={{ fontSize: 11, color: s.muted, fontWeight: 600 }}>{v.qty} шт</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                        <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>Выпечка по дням</h3>
                        <ResponsiveContainer width="100%" height={130}>
                          <BarChart data={dailyProdData}>
                            <XAxis dataKey="day" stroke={s.muted} tick={{ fill: s.muted, fontSize: 10 }} />
                            <YAxis stroke={s.muted} tick={{ fill: s.muted, fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} formatter={(v: any) => [`${v} шт`, "Выпечено"]} />
                            <Bar dataKey="qty" fill={s.gold} radius={[3,3,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {isCurrentProdMonth && todayProd.length > 0 && (
                    <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                      <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>Цех сегодня</h3>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {todayProd.map((r) => (
                          <div key={r.id} style={{ backgroundColor: s.bg, borderRadius: 10, padding: "12px 16px", minWidth: 120, borderLeft: `3px solid ${FLAVOR_COLORS[r.flavor] || s.gold}` }}>
                            <div style={{ color: FLAVOR_COLORS[r.flavor] || s.gold, fontWeight: 700, fontSize: 13 }}>{r.flavor}</div>
                            <div style={{ color: s.text, fontSize: 20, fontWeight: 700, marginTop: 4 }}>{r.quantity} шт</div>
                            {r.defects > 0 && <div style={{ color: "#e57373", fontSize: 12, marginTop: 2 }}>брак: {r.defects}</div>}
                            {r.notes && <div style={{ color: s.muted, fontSize: 11, marginTop: 4 }}>{r.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalBaked === 0 && (
                    <div style={{ textAlign: "center", color: s.muted, fontSize: 13, padding: "60px 0" }}>Нет данных о выпечке за {prodMonthLabel}.</div>
                  )}
                </>
              )}

              {/* ── SUB 1: Тех карты ── */}
              {prodSubTab === 1 && (
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ color: s.gold, fontSize: 15, margin: 0 }}>Технические карты</h3>
                    <button onClick={() => { setEditingRecipe(null); setRecipeForm({ flavor: "", yield_count: 12, notes: "", ingredients: [] }); setShowRecipeModal(true); }}
                      style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "7px 16px", color: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      + Добавить
                    </button>
                  </div>
                  {recipes.length === 0
                    ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Тех карты не заполнены.</div>
                    : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                        {recipes.map((r) => {
                          const cost = calcCost(r);
                          const priceArr = clients.filter((c: any) => c.price_per_unit).map((c: any) => Number(c.price_per_unit));
                          const avgPrice = priceArr.length > 0 ? priceArr.reduce((a, b) => a + b, 0) / priceArr.length : 0;
                          return (
                            <div key={r.id} style={{ backgroundColor: s.bg, borderRadius: 12, padding: 16, border: `1px solid ${s.border}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                  <div style={{ color: FLAVOR_COLORS[r.flavor] || s.gold, fontWeight: 700, fontSize: 15 }}>{r.flavor}</div>
                                  <div style={{ color: s.muted, fontSize: 12, marginTop: 2 }}>Выход: {r.yield_count} шт с замеса</div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => openEditRecipe(r)} style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                                  <button onClick={() => deleteRecipe(r.id)} style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                                </div>
                              </div>
                              {(r.ingredients || []).length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                  {(r.ingredients || []).map((ing: any, i: number) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${s.border}` }}>
                                      <span style={{ color: s.text }}>{ing.name}</span>
                                      <span style={{ color: s.muted }}>{ing.amount} {ing.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {cost && cost.perUnit > 0 ? (
                                <div style={{ backgroundColor: s.card, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
                                  <div>
                                    <div style={{ color: s.muted, fontSize: 11 }}>Себестоимость / шт</div>
                                    <div style={{ color: "#e57373", fontWeight: 700, fontSize: 16 }}>{Math.round(cost.perUnit).toLocaleString("ru-RU")} ₸</div>
                                  </div>
                                  {avgPrice > 0 && (
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ color: s.muted, fontSize: 11 }}>Маржа (сред.)</div>
                                      <div style={{ color: "#81c784", fontWeight: 700, fontSize: 16 }}>+{Math.round(avgPrice - cost.perUnit).toLocaleString("ru-RU")} ₸</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ color: s.muted, fontSize: 11, textAlign: "center", padding: "8px 0" }}>Добавьте расходы по ингредиентам для расчёта себестоимости</div>
                              )}
                              {r.notes && <div style={{ color: s.muted, fontSize: 12, marginTop: 10, fontStyle: "italic" }}>{r.notes}</div>}
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              )}

              {/* ── SUB 2: Склад ── */}
              {prodSubTab === 2 && (() => {
                const PROD_CATS = ["ингредиент", "упаковка", "прочее"];
                const CAT_UNITS: Record<string, string[]> = {
                  "ингредиент": ["г","кг","л","мл","шт"],
                  "упаковка": ["шт","уп"],
                  "прочее": ["шт","уп","г","кг"],
                };
                const CAT_COLORS: Record<string, string> = { "ингредиент": "#c8a96e", "упаковка": "#64b5f6", "прочее": "#888" };

                const grouped: Record<string, any[]> = {};
                products.forEach((p) => {
                  if (!grouped[p.category]) grouped[p.category] = [];
                  grouped[p.category].push(p);
                });

                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                      <div>
                        <h2 style={{ color: s.gold, fontSize: 16, margin: 0 }}>Каталог товаров и сырья</h2>
                        <div style={{ color: s.muted, fontSize: 12, marginTop: 4 }}>{products.length} позиций</div>
                      </div>
                      <button onClick={() => { setEditingProduct(null); setProductForm({ name: "", unit: "г", category: "ингредиент", notes: "" }); setShowProductModal(true); }}
                        style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "9px 20px", color: "#ffffff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        + Добавить товар
                      </button>
                    </div>

                    {products.length === 0 && (
                      <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 40, textAlign: "center", color: s.muted }}>
                        Каталог пуст. Добавьте первый товар — ингредиент, упаковку или расходник.
                      </div>
                    )}

                    {PROD_CATS.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
                      <div key={cat} style={{ marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: CAT_COLORS[cat] }} />
                          <h3 style={{ color: CAT_COLORS[cat], fontSize: 13, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
                            {cat === "ингредиент" ? "Ингредиенты" : cat === "упаковка" ? "Упаковка" : "Прочее"} ({grouped[cat].length})
                          </h3>
                        </div>
                        <div style={{ backgroundColor: s.card, borderRadius: 12, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                                {["Название","Ед.","Куплено","Израсходовано","Остаток",""].map((h) => (
                                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grouped[cat].map((p) => {
                                const st = getProductStock(p);
                                const isLow = st.stock < 0;
                                return (
                                  <tr key={p.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ padding: "12px 14px", color: s.muted }}>{p.unit}</td>
                                    <td style={{ padding: "12px 14px", color: "#81c784" }}>
                                      {st.purchased > 0 ? fromBase(st.purchased, st.base) : "—"}
                                    </td>
                                    <td style={{ padding: "12px 14px", color: "#e57373" }}>
                                      {st.consumed > 0 ? fromBase(st.consumed, st.base) : "—"}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                      <span style={{ color: isLow ? "#e57373" : st.stock > 0 ? s.gold : s.muted, fontWeight: 700 }}>
                                        {st.stock !== 0 ? fromBase(Math.abs(st.stock), st.base) : "—"}
                                        {isLow ? " ⚠️" : ""}
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => openPrihod(p)}
                                          style={{ backgroundColor: "#81c78422", border: "1px solid #81c784", color: "#81c784", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                          + Приход
                                        </button>
                                        <button onClick={() => { setEditingProduct(p); setProductForm({ name: p.name, unit: p.unit, category: p.category, notes: p.notes || "" }); setShowProductModal(true); }}
                                          style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                                        <button onClick={() => deleteProduct(p.id)}
                                          style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── SUB 3: Ревизия ── */}
              {prodSubTab === 3 && (
                <div>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <div>
                      <h2 style={{ color: s.gold, fontSize: 16, margin: 0 }}>Ревизия склада</h2>
                      <div style={{ color: s.muted, fontSize: 12, marginTop: 4 }}>Расчётный остаток vs фактический</div>
                    </div>
                    <button onClick={() => { setShowRevisionForm(true); setRevisionActuals({}); }}
                      style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "9px 20px", color: "#ffffff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      + Провести ревизию
                    </button>
                  </div>

                  {/* Current expected stock from catalog */}
                  {products.length > 0 && (
                    <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                      <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>Расчётные остатки по каталогу</h3>
                      {products.length === 0
                        ? <div style={{ color: s.muted, fontSize: 13 }}>Добавьте товары в каталог (вкладка Склад)</div>
                        : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                                {["Товар","Ед.","Закуплено","Израсходовано","Расчётный остаток"].map((h) => (
                                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: s.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {products.map((p) => {
                                const st = getProductStock(p);
                                return (
                                  <tr key={p.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ padding: "10px 12px", color: s.muted }}>{p.unit}</td>
                                    <td style={{ padding: "10px 12px", color: "#81c784" }}>{st.purchased > 0 ? fromBase(st.purchased, st.base) : "—"}</td>
                                    <td style={{ padding: "10px 12px", color: "#e57373" }}>{st.consumed > 0 ? fromBase(st.consumed, st.base) : "—"}</td>
                                    <td style={{ padding: "10px 12px" }}>
                                      <span style={{ color: st.stock >= 0 ? s.gold : "#e57373", fontWeight: 700 }}>
                                        {fromBase(Math.abs(st.stock), st.base)}{st.stock < 0 ? " ⚠️" : ""}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                      }
                    </div>
                  )}

                  {/* Shopping list */}
                  {shoppingList.length > 0 && (
                    <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                      <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 4 }}>Список на закупку</h3>
                      <div style={{ color: s.muted, fontSize: 12, marginBottom: 16 }}>На основе предстоящих заказов</div>
                      {shoppingList.map((item) => (
                        <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${s.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 16 }}>{item.needToBuy ? "🔴" : "🟢"}</span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                          </div>
                          <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: s.muted }}>Нужно</div>
                              <div style={{ color: s.text, fontWeight: 600 }}>{fromBase(item.required, item.base)}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: s.muted }}>Есть</div>
                              <div style={{ color: item.have > 0 ? "#81c784" : s.muted, fontWeight: 600 }}>{fromBase(Math.max(0, item.have), item.base)}</div>
                            </div>
                            {item.needToBuy && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ color: s.muted }}>Докупить</div>
                                <div style={{ color: "#e57373", fontWeight: 700 }}>{fromBase(item.deficit, item.base)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Revision history */}
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, boxShadow: s.sh }}>
                    <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>История ревизий</h3>
                    {revisions.length === 0
                      ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Ревизии ещё не проводились</div>
                      : revisions.map((rev) => (
                          <div key={rev.id} style={{ backgroundColor: s.bg, borderRadius: 10, padding: 16, marginBottom: 12, border: `1px solid ${s.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                              <div>
                                <div style={{ color: s.gold, fontWeight: 700, fontSize: 14 }}>{rev.revision_date}</div>
                                <div style={{ color: s.muted, fontSize: 12 }}>Провёл: {rev.conducted_by}</div>
                              </div>
                              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                                <span style={{ color: "#e57373" }}>
                                  Недостач: {(rev.items || []).filter((i: any) => i.diff < 0).length}
                                </span>
                                <span style={{ color: "#81c784" }}>
                                  Излишков: {(rev.items || []).filter((i: any) => i.diff > 0).length}
                                </span>
                              </div>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                                  {["Ингредиент","Расчётно","Факт","Расхождение"].map((h) => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: s.muted, fontWeight: 600 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(rev.items || []).map((item: any, i: number) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                                    <td style={{ padding: "6px 8px" }}>{item.ingredient}</td>
                                    <td style={{ padding: "6px 8px", color: s.muted }}>{fromBase(item.expected, item.unit)}</td>
                                    <td style={{ padding: "6px 8px" }}>{fromBase(item.actual, item.unit)}</td>
                                    <td style={{ padding: "6px 8px" }}>
                                      <span style={{ color: item.diff === 0 ? s.muted : item.diff > 0 ? "#81c784" : "#e57373", fontWeight: 700 }}>
                                        {item.diff > 0 ? "+" : ""}{fromBase(item.diff, item.unit)}
                                        {Math.abs(item.diff) > item.expected * 0.1 && item.diff < 0 ? " ⚠️" : ""}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {rev.notes && <div style={{ color: s.muted, fontSize: 12, marginTop: 10, fontStyle: "italic" }}>{rev.notes}</div>}
                          </div>
                        ))
                    }
                  </div>

                  {/* Revision form modal */}
                  {showRevisionForm && (
                    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
                      <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 6 }}>Ревизия склада</h2>
                        <p style={{ color: s.muted, fontSize: 13, marginBottom: 20 }}>Введите фактическое количество каждого ингредиента</p>

                        {products.length === 0
                          ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                              Добавьте товары в каталог (вкладка Склад), чтобы проводить ревизию
                            </div>
                          : products.map((p) => {
                              const st = getProductStock(p);
                              const actual = revisionActuals[p.name];
                              const actualNum = parseFloat(actual || "0");
                              const diff = actualNum - Math.max(0, st.stock);
                              return (
                                <div key={p.id} style={{ marginBottom: 14 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <label style={{ color: s.text, fontSize: 13, fontWeight: 600 }}>{p.name}</label>
                                    <span style={{ color: s.muted, fontSize: 12 }}>расчётно: {fromBase(Math.max(0, st.stock), st.base)}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                      type="number" min="0" placeholder="0"
                                      value={actual || ""}
                                      onChange={(e) => setRevisionActuals((prev) => ({ ...prev, [p.name]: e.target.value }))}
                                      style={{ flex: 1, backgroundColor: s.bg, border: `1px solid ${actual ? s.gold : s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 14, outline: "none" }}
                                    />
                                    <span style={{ color: s.muted, fontSize: 13, minWidth: 30 }}>{st.base}</span>
                                    {actual && (
                                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70, textAlign: "right", color: diff >= 0 ? "#81c784" : "#e57373" }}>
                                        {diff >= 0 ? `+${fromBase(diff, st.base)}` : `−${fromBase(Math.abs(diff), st.base)}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        }

                        <div style={{ marginTop: 16, marginBottom: 20 }}>
                          <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Заметки</label>
                          <textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} rows={2} placeholder="Причины расхождений, замечания..."
                            style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }} />
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={saveRevision} disabled={savingRevision || stockEntries.length === 0}
                            style={{ flex: 2, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "11px", color: "#ffffff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                            {savingRevision ? "Сохранение..." : "Сохранить ревизию"}
                          </button>
                          <button onClick={() => setShowRevisionForm(false)}
                            style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "11px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                            Отмена
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── TAB 5: Аналитика ИИ ── */}
        {tab === 5 && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 8 }}>ИИ-аналитик BerryCake</h2>
              <p style={{ color: s.muted, fontSize: 13, marginBottom: 20 }}>Claude проанализирует последние 200 заказов и даст рекомендации по вкусам, клиентам и трендам.</p>
              <button onClick={runAI} disabled={aiLoading}
                style={{ backgroundColor: aiLoading ? s.border : s.gold, border: "none", borderRadius: 8, padding: "10px 24px", color: aiLoading ? s.muted : "#ffffff", fontWeight: 700, fontSize: 14, cursor: aiLoading ? "default" : "pointer" }}>
                {aiLoading ? "⏳ Анализирую..." : "✨ Запустить анализ"}
              </button>
            </div>

            {aiResult && (
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24 }}>
                <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>Результат анализа</h3>
                <div style={{ color: s.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>Редактировать заказ</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["client_name","Клиент"],["phone","Телефон"],
                ["cake_flavor","Вкус"],["quantity","Количество (шт)"],
                ["order_date","Дата (ГГГГ-ММ-ДД)"],["order_time","Время (ЧЧ:ММ)"],
                ["address","Адрес"],["payment_type","Тип оплаты"],
                ["paid_amount","Оплачено (₸)"],["total_amount","Сумма (₸)"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={orderEditForm[field] ?? ""} onChange={(e) => setOrderEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Заметки</label>
              <textarea value={orderEditForm.notes ?? ""} onChange={(e) => setOrderEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Статус</label>
              <select value={orderEditForm.status} onChange={(e) => setOrderEditForm((f) => ({ ...f, status: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13 }}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={saveOrderEdit}
                style={{ flex: 1, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "10px", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Сохранить
              </button>
              <button onClick={() => setEditingOrder(null)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 400 }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>{editingUser ? "Редактировать" : "Новый пользователь"}</h2>
            {[["name","Имя"], ["pin","PIN-код (4-6 цифр)"]].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input
                  value={userForm[field]}
                  onChange={(e) => setUserForm((f) => ({ ...f, [field]: e.target.value }))}
                  maxLength={field === "pin" ? 6 : 50}
                  inputMode={field === "pin" ? "numeric" : "text"}
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Роль</label>
              <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13 }}>
                <option value="">— выберите —</option>
                <option value="Соучредитель">Соучредитель</option>
                <option value="Операционный Директор">Операционный Директор</option>
                <option value="Менеджер цеха">Менеджер цеха</option>
                <option value="Менеджер">Менеджер</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={saveUser} disabled={!userForm.name || !userForm.pin || userForm.pin.length < 4 || !userForm.role}
                style={{ flex: 1, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "10px", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Сохранить
              </button>
              <button onClick={() => setShowUserModal(false)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (() => {
        const PROD_CATS = ["ингредиент", "упаковка", "прочее"];
        const UNIT_OPTIONS: Record<string, string[]> = {
          "ингредиент": ["г","кг","мл","л","шт"],
          "упаковка": ["шт","уп"],
          "прочее": ["шт","уп","г","кг"],
        };
        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 400 }}>
              <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>{editingProduct ? "Редактировать" : "Добавить товар"}</h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Название *</label>
                <input value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} placeholder="Мука, Крем-чиз, Коробка..."
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Категория</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PROD_CATS.map((c) => (
                    <button key={c} onClick={() => setProductForm((f) => ({ ...f, category: c, unit: UNIT_OPTIONS[c][0] }))}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${productForm.category === c ? s.gold : s.border}`, background: productForm.category === c ? s.gold + "22" : "none", color: productForm.category === c ? s.gold : s.muted, fontSize: 13, cursor: "pointer", fontWeight: productForm.category === c ? 700 : 400 }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Единица измерения</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(UNIT_OPTIONS[productForm.category] || ["шт"]).map((u) => (
                    <button key={u} onClick={() => setProductForm((f) => ({ ...f, unit: u }))}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${productForm.unit === u ? s.gold : s.border}`, background: productForm.unit === u ? s.gold + "22" : "none", color: productForm.unit === u ? s.gold : s.muted, fontSize: 13, cursor: "pointer", fontWeight: productForm.unit === u ? 700 : 400 }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Заметки</label>
                <input value={productForm.notes} onChange={(e) => setProductForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Поставщик, бренд..."
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={saveProduct} disabled={!productForm.name}
                  style={{ flex: 2, backgroundColor: productForm.name ? s.gold : s.border, border: "none", borderRadius: 8, padding: "10px", color: productForm.name ? "#ffffff" : s.muted, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  {editingProduct ? "Сохранить" : "Добавить"}
                </button>
                <button onClick={() => setShowProductModal(false)}
                  style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Приход Modal */}
      {showPrihodModal && prihodProduct && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 400 }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 4 }}>Приход товара</h2>
            <div style={{ color: "#81c784", fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{prihodProduct.name}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Количество ({prihodProduct.unit}) *</label>
                <input type="number" min="0" placeholder="0" value={prihodForm.quantity}
                  onChange={(e) => setPrihodForm((f) => ({ ...f, quantity: e.target.value }))} autoFocus
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${prihodForm.quantity ? s.gold : s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              <div>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Сумма (₸) *</label>
                <input type="number" min="0" placeholder="0" value={prihodForm.amount}
                  onChange={(e) => setPrihodForm((f) => ({ ...f, amount: e.target.value }))}
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${prihodForm.amount ? s.gold : s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Тип оплаты</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["нал","каспи","со счёта ИП"].map((pt) => (
                  <button key={pt} onClick={() => setPrihodForm((f) => ({ ...f, payment_type: pt }))}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${prihodForm.payment_type === pt ? s.gold : s.border}`, background: prihodForm.payment_type === pt ? s.gold + "22" : "none", color: prihodForm.payment_type === pt ? s.gold : s.muted, fontSize: 12, cursor: "pointer", fontWeight: prihodForm.payment_type === pt ? 700 : 400 }}>
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Дата</label>
              <input type="date" value={prihodForm.date} onChange={(e) => setPrihodForm((f) => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>

            {prihodForm.quantity && prihodForm.amount && (
              <div style={{ backgroundColor: s.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: s.muted }}>Цена за {prihodProduct.unit}</span>
                <span style={{ color: s.gold, fontWeight: 700 }}>
                  {(parseFloat(prihodForm.amount) / parseFloat(prihodForm.quantity)).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₸
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={savePrihod} disabled={savingPrihod || !prihodForm.quantity || !prihodForm.amount}
                style={{ flex: 2, backgroundColor: (!prihodForm.quantity || !prihodForm.amount) ? s.border : "#81c784", border: "none", borderRadius: 8, padding: "11px", color: (!prihodForm.quantity || !prihodForm.amount) ? s.muted : "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {savingPrihod ? "Сохранение..." : "Записать приход"}
              </button>
              <button onClick={() => setShowPrihodModal(false)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "11px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>{editingRecipe ? "Редактировать тех карту" : "Новая тех карта"}</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Вкус</label>
              <select value={recipeForm.flavor} onChange={(e) => setRecipeForm((f: any) => ({ ...f, flavor: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13 }}>
                <option value="">— выберите —</option>
                {PROD_FLAVORS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Выход с 1 замеса (шт)</label>
              <input type="number" value={recipeForm.yield_count} onChange={(e) => setRecipeForm((f: any) => ({ ...f, yield_count: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ color: s.muted, fontSize: 12 }}>Ингредиенты</label>
                <button onClick={addIngredientRow}
                  style={{ background: "none", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>
                  + Добавить
                </button>
              </div>
              {recipeForm.ingredients.length === 0 && (
                <div style={{ color: s.muted, fontSize: 12, textAlign: "center", padding: "12px 0" }}>Нет ингредиентов. Нажмите «+ Добавить»</div>
              )}
              {recipeForm.ingredients.map((ing: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input placeholder="Название" value={ing.name} onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    style={{ flex: 2, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13, outline: "none" }} />
                  <input type="number" placeholder="0" value={ing.amount} onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                    style={{ width: 70, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 8px", color: s.text, fontSize: 13, outline: "none" }} />
                  <select value={ing.unit} onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    style={{ width: 60, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 6px", color: s.text, fontSize: 12 }}>
                    {["г","кг","л","мл","шт","уп"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeIngredient(i)}
                    style={{ background: "none", border: "none", color: "#e57373", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Заметки</label>
              <textarea value={recipeForm.notes} onChange={(e) => setRecipeForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={saveRecipe} disabled={!recipeForm.flavor}
                style={{ flex: 2, backgroundColor: recipeForm.flavor ? s.gold : s.border, border: "none", borderRadius: 8, padding: "10px", color: recipeForm.flavor ? "#ffffff" : s.muted, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {editingRecipe ? "Сохранить" : "Создать"}
              </button>
              <button onClick={() => setShowRecipeModal(false)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>Новый заказ</h2>

            {/* Client search */}
            <div style={{ marginBottom: 14, position: "relative" }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Клиент</label>
              <input
                value={addClientQuery}
                onChange={(e) => {
                  setAddClientQuery(e.target.value);
                  setAddForm((f) => ({ ...f, client_name: e.target.value, phone: "" }));
                }}
                placeholder="Поиск из базы или введите имя..."
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              {addClientSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#222", border: `1px solid ${s.border}`, borderRadius: 8, zIndex: 10, overflow: "hidden", marginTop: 2 }}>
                  {addClientSuggestions.map((c) => (
                    <div key={c.id}
                      onClick={() => { setAddForm((f) => ({ ...f, client_name: c.name, phone: c.phone || "" })); setAddClientQuery(c.name); setAddClientSuggestions([]); }}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${s.border}`, fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = s.card}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <span style={{ color: s.gold, fontWeight: 600 }}>{c.name}</span>
                      {c.phone && <span style={{ color: s.muted, fontSize: 12, marginLeft: 10 }}>{c.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["phone","Телефон"], ["cake_flavor","Вкус"],
                ["quantity","Количество (шт)"], ["order_date","Дата"],
                ["order_time","Время (ЧЧ:ММ)"], ["address","Адрес"],
                ["total_amount","Сумма (₸)"], ["payment_type","Тип оплаты"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    type={field === "order_date" ? "date" : "text"}
                    value={addForm[field]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 10px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Заметки</label>
              <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addOrder} disabled={!addForm.client_name}
                style={{ flex: 2, backgroundColor: addForm.client_name ? s.gold : s.border, border: "none", borderRadius: 8, padding: "11px", color: addForm.client_name ? "#ffffff" : s.muted, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Добавить заказ
              </button>
              <button onClick={() => { setShowAddModal(false); setAddClientQuery(""); setAddClientSuggestions([]); }}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "11px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
