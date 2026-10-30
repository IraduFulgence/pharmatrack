import Navbar from './components/navbar';
import Hero from './components/hero';
import WhyChooseUs from './components/whyus';
function App() {

  return (
    <div className='min-h-screen w-full bg-white dark:bg-gray-950 transition-colors' >
      <Navbar />
      <Hero />
    </div>
  )
}

export default App
