import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "./middleware/requireAuth.js";

const router = Router();

router.get("/login", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "read:user",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing OAuth code");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("GitHub token exchange response:", tokenData);
      return res.status(401).send("GitHub OAuth exchange failed");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userRes.json();

    const appJwt = jwt.sign(
      { id: String(githubUser.id), login: githubUser.login },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", appJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/dashboard");
  } catch (error) {
    console.error("OAuth callback failed:", error);
    res.status(500).send("Authentication failed");
  }
});

router.get("/logout", (_req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

router.get("/api/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id, login: req.user.login });
});

export default router;
