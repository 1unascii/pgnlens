interface StatCardProps {               
    label: string                                                                    
    value: string | number  }                                                                                    
                                                                                     
function StatCard({ label, value }: StatCardProps) {
    return (
        <div className="border rounded-lg p-4 shadow-sm text-center">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    )
}

export default StatCard