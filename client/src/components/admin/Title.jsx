const Title = ({ text1, text2, highlight }) => {
  const renderText = (text, isHighlighted) =>
    isHighlighted ? <span className='underline text-primary'>{text}</span> : text;

  return (
    <h1 className='font-medium text-2xl'>
      {renderText(text1, highlight === 1)} {renderText(text2, highlight === 2)}
    </h1>
  );
};


export default Title;
