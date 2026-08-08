import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, Truck } from 'lucide-react'
import './HeroBanner.css'

const SLIDES = [
  {
    id: 'rakhi', image: '/hero_banners/rakhi_offer.png', campaign: 'Rakhi Sweet Sale',
    title: 'Make Raksha Bandhan Extra Sweet',
    subtitle: 'Celebrate the bond of love with delicious sweets and chocolates from your nearby stores.',
    offer: 'FLAT 25% OFF', coupon: 'Use Code: RAKHI25', cta: 'Order Now', path: '/products?q=sweets'
  },
  {
    id: 'india', image: '/hero_banners/independence_offer.png', campaign: '                                    ',
    title: '                                    ',
    subtitle: 'Get exciting discounts on daily essentials from trusted local stores.',
    offer: 'FLAT 20% OFF', coupon: 'Use Code: INDIA20 · On orders above ₹499', cta: 'Shop Now', path: '/products'
  }
]

function HeroBanner() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const startX = useRef(null)
  const changeSlide = useCallback((direction) => setActive(current => (current + direction + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => changeSlide(1), 4500)
    return () => window.clearInterval(timer)
  }, [paused, changeSlide])

  const handleTouchEnd = (event) => {
    if (startX.current === null) return
    const distance = event.changedTouches[0].clientX - startX.current
    if (Math.abs(distance) > 45) changeSlide(distance > 0 ? -1 : 1)
    startX.current = null
  }

  return (
    <section className="hero-banner" aria-label="Featured festive offers" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={e => { startX.current = e.touches[0].clientX }} onTouchEnd={handleTouchEnd}>
      <div className="hero-banner__track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {SLIDES.map((slide, index) => (
          <article className={`hero-banner__slide hero-banner__slide--${slide.id} ${index === active ? 'is-active' : ''}`} key={slide.id} aria-hidden={index !== active}>
            <img className="hero-banner__image" src={slide.image} alt={`${slide.campaign} promotional banner`} loading={index === 0 ? 'eager' : 'lazy'} />
            <div className="hero-banner__shade" />
            <div className="hero-banner__sparkles" aria-hidden="true"><i /><i /><i /><i /></div>
            {slide.id === 'india' && <div className="hero-banner__chakra" aria-hidden="true">☸</div>}
            <div className="hero-banner__content">
              <span className="hero-banner__campaign">{slide.campaign}</span>
              <span className="hero-banner__offer">{slide.offer}</span>
              <h1>{slide.title}</h1>
              <p>{slide.subtitle}</p>
              <div className="hero-banner__coupon">{slide.coupon}</div>
              <button className="hero-banner__cta" type="button" tabIndex={index === active ? 0 : -1} onClick={() => navigate(slide.path)}>{slide.cta} <Truck size={17} /></button>
              <span className="hero-banner__nearby"><MapPin size={14} /> Best festive offers from nearby stores, delivered quickly</span>
            </div>
          </article>
        ))}
      </div>
      <button className="hero-banner__arrow hero-banner__arrow--left" type="button" aria-label="Previous offer" onClick={() => changeSlide(-1)}><ChevronLeft /></button>
      <button className="hero-banner__arrow hero-banner__arrow--right" type="button" aria-label="Next offer" onClick={() => changeSlide(1)}><ChevronRight /></button>
      <div className="hero-banner__dots" role="tablist" aria-label="Offer slides">
        {SLIDES.map((slide, index) => <button key={slide.id} type="button" role="tab" aria-selected={index === active} aria-label={`Show ${slide.campaign}`} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} />)}
      </div>
    </section>
  )
}

export default HeroBanner
