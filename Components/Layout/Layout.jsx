const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <NavBar />
      <main className="main-content">
        {children}
      </main>
      <footer className="footer glass-morphism">
        <p>ChatDApp © 2024</p>
      </footer>
    </div>
  );
}; 