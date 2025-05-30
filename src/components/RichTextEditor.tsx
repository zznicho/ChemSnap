import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's styles

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const RichTextEditor = ({ value, onChange, placeholder, readOnly = false }: RichTextEditorProps) => {
  const modules = {
    toolbar: [
      [{ 'header': '1'}, {'header': '2'}, { 'header': [3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'video'],
      [{ 'color': [] }, { 'background': [] }], // Add color and background options
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background'
  ];

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md border border-input"
      />
    </div>
  );
};

export default RichTextEditor;