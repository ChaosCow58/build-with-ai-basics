export type Sample = {
  id: "js-debounce" | "py-memo" | "cs-async";
  label: string;
  blurb: string;
  language: string;
  intent: string;
  code: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "js-debounce",
    label: "JS debounce",
    blurb: "Closure + `this` trap",
    language: "javascript",
    intent: "Only run the search after the user stops typing for 250ms.",
    code: `// Debounce: only run \`fn\` after the user stops typing for \`wait\` ms.
function debounce(fn, wait = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, wait);
  };
}

const search = {
  query: "",
  run() {
    console.log(\`Searching for "\${this.query}"\`);
  },
};

const input = document.querySelector("#search");
const debouncedRun = debounce(search.run, 250);

input.addEventListener("input", (e) => {
  search.query = e.target.value;
  debouncedRun();
});`,
  },
  {
    id: "py-memo",
    label: "Python memo recursion",
    blurb: "Mutable default trap",
    language: "python",
    intent: "Count grid paths around walls, and compute big Fibonacci numbers fast.",
    code: `from functools import lru_cache

def count_paths(grid, memo={}):
    """Count paths from top-left to bottom-right moving only right/down.
    Cells with 1 are walls."""
    rows, cols = len(grid), len(grid[0])

    def walk(r, c):
        if r >= rows or c >= cols or grid[r][c] == 1:
            return 0
        if (r, c) == (rows - 1, cols - 1):
            return 1
        if (r, c) in memo:
            return memo[(r, c)]
        memo[(r, c)] = walk(r + 1, c) + walk(r, c + 1)
        return memo[(r, c)]

    return walk(0, 0)


@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


print(count_paths([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))  # 2
print(count_paths([[0, 0, 0, 0]]))                       # ?
print(fib(80))`,
  },
  {
    id: "cs-async",
    label: "C# async + LINQ",
    blurb: "Deferred execution trap",
    language: "csharp",
    intent: "Return the top customers by total spend, with their names filled in.",
    code: `public async Task<List<OrderSummary>> GetTopCustomersAsync(int top = 5)
{
    var orders = await _db.Orders
        .Where(o => o.Status != OrderStatus.Cancelled)
        .ToListAsync();

    var summaries = orders
        .GroupBy(o => o.CustomerId)
        .Select(g => new OrderSummary
        {
            CustomerId = g.Key,
            Total = g.Sum(o => o.Amount),
            LastOrder = g.Max(o => o.PlacedAt)
        })
        .OrderByDescending(s => s.Total);

    foreach (var s in summaries.Take(top))
    {
        s.Name = await _customers.GetNameAsync(s.CustomerId);
    }

    return summaries.Take(top).ToList();
}`,
  },
];

export function normalizeCode(code: string): string {
  return code.replace(/\r\n/g, "\n").trim();
}

export function findSample(code: string): Sample | undefined {
  const n = normalizeCode(code);
  return SAMPLES.find((s) => normalizeCode(s.code) === n);
}
