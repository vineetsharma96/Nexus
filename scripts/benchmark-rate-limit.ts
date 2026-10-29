const rateLimitMapOld = new Map<string, number[]>();

function isRateLimitedOld(ip: string, maxReq: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMapOld.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxReq) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMapOld.set(ip, validTimestamps);
  return false;
}

const rateLimitMapNew = new Map<string, { count: number; resetTime: number }>();

function isRateLimitedNew(ip: string, maxReq: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  let record = rateLimitMapNew.get(ip);

  if (!record || now >= record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitMapNew.set(ip, record);
  }

  if (record.count >= maxReq) {
    return true;
  }

  record.count++;
  return false;
}

function runBenchmark() {
    const iters = 1000000;
    const ip = "127.0.0.1";

    // Benchmark Old
    const startOld = performance.now();
    for (let i = 0; i < iters; i++) {
        isRateLimitedOld(ip + (i % 10000), 20, 60000);
    }
    const endOld = performance.now();

    // Benchmark New
    const startNew = performance.now();
    for (let i = 0; i < iters; i++) {
        isRateLimitedNew(ip + (i % 10000), 20, 60000);
    }
    const endNew = performance.now();

    console.log(`Old: ${endOld - startOld}ms`);
    console.log(`New: ${endNew - startNew}ms`);
}

runBenchmark();
