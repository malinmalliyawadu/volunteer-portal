import MillionLint from "@million/lint";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default MillionLint.next({
  enabled: true,
  rsc: true,
})(nextConfig);
