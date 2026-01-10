export const Home = () => {
  return (
    <div className="w-full">
      {/* TEST BANNER - DELETE THIS */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-8 rounded-xl shadow-2xl m-4">
        <h1 className="text-5xl font-bold text-white text-center mb-4">
          🎉 PREVIEW TEST BANNER 🎉
        </h1>
        <p className="text-2xl text-white text-center">
          If you can see this, the Vercel Preview deployment is working!
        </p>
        <p className="text-lg text-white/80 text-center mt-4">
          This is a test change for PR preview notifications.
        </p>
      </div>
    </div>
  );
};
