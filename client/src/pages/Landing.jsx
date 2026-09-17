export default function Landing() {
  return (
    <div className="landing-hero">
      <div className="landing">
        <span className="landing-badge">Personal AI prompt library</span>
        <h1>AI Capsule</h1>
        <p className="tagline">Keep the prompts worth keeping.</p>
        <p>
          Save the prompts you use for coding, writing, debugging and study — along with which project
          they were for, whether the response was useful, and any notes for next time.
        </p>

        <div className="feature-list">
          <div>
            <strong>Organize by project</strong>
            <span>Group capsules by the assignment or task they came from.</span>
          </div>
          <div>
            <strong>Track usefulness</strong>
            <span>Mark whether a response was reviewed and improved over time.</span>
          </div>
          <div>
            <strong>Yours alone</strong>
            <span>Signed in with GitHub — only you can see your own capsules.</span>
          </div>
        </div>

        <a className="btn btn-primary" href="/login">Login with GitHub</a>
      </div>
    </div>
  );
}