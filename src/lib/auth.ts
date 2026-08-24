import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // No adapter (JWT-only sessions — this app has no Account/Session tables), so
    // Google sign-in resolves/creates the `User` row by hand here. Reassigning
    // `user.id` to our DB id is what makes the `jwt` callback below stamp the
    // right id into the session.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const email = user.email.toLowerCase();
      let dbUser = await db.user.findUnique({ where: { email } });
      if (!dbUser) {
        dbUser = await db.user.create({ data: { email, name: user.name, image: user.image } });
      }
      user.id = dbUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
