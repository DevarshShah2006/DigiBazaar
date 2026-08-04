import './HeroBanner.css'

const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXaMvGxZqUO65PbYr2HWKUF4Bn-_VaF5q4jqHZ3TW5cfQxrBRYa1HDwb0xgvZrKQS7CYdUplclzuPafEdxDyeU9R1JNGJ3xLhHBG54UqiDJbMJFJ8-OX4WXRu46n7TxMoavMac3VxS6lBB44E2jvBcqzehOsZKYBpjXdioKNDUDftPZ7F1pwPIlxEIQzvtTVflw1Zn1zEzXOzr-T2cjvWeHpoCRKM8Xl6tLnjkN9ynoDr8wtw-ahUu'

function HeroBanner() {
  return (
    <section className="hero-banner">
      <div className="hero-banner__image" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
      <div className="hero-banner__overlay" />
      <div className="hero-banner__content">
        <span className="hero-banner__label">Festive Special</span>
        <h1 className="hero-banner__title">Diwali Sweets & Hampers</h1>
        <button className="hero-banner__cta">Pre-order</button>
      </div>
    </section>
  )
}

export default HeroBanner
