import Navbar from './components/navbar';
import Hero from './components/hero';
import WhyChooseUs from './components/whyus';
import HowItWorks from './components/how';
import Footer from './components/footer';
function App() {

  return (
    <div className='min-h-screen w-full bg-white dark:bg-gray-950 transition-colors' >
      <Navbar />
      <Hero />
      <WhyChooseUs />
      <HowItWorks />
      <Footer />
    </div>
  )
}

export default App
